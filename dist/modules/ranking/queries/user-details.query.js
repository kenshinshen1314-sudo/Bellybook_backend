"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserDetailsQuery = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../database/prisma.service");
const client_1 = require("@prisma/client");
let UserDetailsQuery = class UserDetailsQuery {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCuisineExpertDetail(userId, cuisineName, period, limit = 50, offset = 0) {
        const { startDate, startDateCondition } = this.getDateRangeSql(period);
        const result = await this.prisma.$queryRaw `
      SELECT
        u.id as "userId",
        u.username,
        u."avatarUrl",
        m."foodName",
        m.cuisine,
        m."createdAt",
        m."imageUrl",
        m.calories,
        m.notes
      FROM users u
      INNER JOIN meals m ON m."userId" = u.id
        AND m.cuisine = ${cuisineName}
        AND m."deletedAt" IS NULL
        ${startDateCondition}
      WHERE u.id = ${userId}
        AND u."deletedAt" IS NULL
      ORDER BY m."createdAt" DESC
    `;
        if (result.length === 0) {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, username: true, avatarUrl: true },
            });
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            return {
                userId: user.id,
                username: user.username,
                avatarUrl: user.avatarUrl,
                cuisineName,
                period,
                totalDishes: 0,
                totalMeals: 0,
                dishes: [],
                offset,
                limit,
                hasMore: false,
            };
        }
        const firstRow = result[0];
        const dishStats = new Map();
        for (const row of result) {
            const existing = dishStats.get(row.foodName);
            if (!existing) {
                dishStats.set(row.foodName, {
                    dishName: row.foodName,
                    cuisine: row.cuisine,
                    mealCount: 1,
                    firstMealAt: new Date(row.createdAt).toISOString(),
                    lastMealAt: new Date(row.createdAt).toISOString(),
                    imageUrl: row.imageUrl || undefined,
                    calories: row.calories || undefined,
                    notes: row.notes || undefined,
                });
            }
            else {
                existing.mealCount++;
                existing.lastMealAt = new Date(row.createdAt).toISOString();
            }
        }
        const allDishes = Array.from(dishStats.values()).sort((a, b) => b.mealCount - a.mealCount);
        const paginatedDishes = allDishes.slice(offset, offset + limit);
        return {
            userId: firstRow.userId,
            username: firstRow.username,
            avatarUrl: firstRow.avatarUrl,
            cuisineName,
            period,
            totalDishes: allDishes.length,
            totalMeals: result.length,
            dishes: paginatedDishes,
            offset,
            limit,
            hasMore: offset + limit < allDishes.length,
        };
    }
    async getAllUsersDishes(period) {
        const { startDate, startDateCondition } = this.getDateRangeSql(period);
        const entries = await this.prisma.$queryRaw `
      SELECT
        u.id as "userId",
        u.username,
        u."avatarUrl",
        m.cuisine as "cuisineName",
        COUNT(DISTINCT m."foodName") as "dishCount",
        COUNT(m.id) as "mealCount",
        MIN(m."createdAt") as "firstMealAt"
      FROM users u
      INNER JOIN meals m ON m."userId" = u.id
        AND m."deletedAt" IS NULL
        ${startDateCondition}
      LEFT JOIN user_settings us ON us."userId" = u.id
      WHERE u."deletedAt" IS NULL
        AND (us.id IS NULL OR us."hideRanking" = false)
      GROUP BY u.id, u.username, u."avatarUrl", m.cuisine
      HAVING COUNT(DISTINCT m."foodName") > 0
      ORDER BY "dishCount" DESC, "firstMealAt" ASC
    `;
        const rankedEntries = entries.map((e, index) => ({
            rank: index + 1,
            userId: e.userId,
            username: e.username,
            avatarUrl: e.avatarUrl,
            cuisineName: e.cuisineName,
            dishCount: Number(e.dishCount),
            mealCount: Number(e.mealCount),
            firstMealAt: e.firstMealAt.toISOString(),
        }));
        const uniqueUsers = new Set(rankedEntries.map(e => e.userId));
        const uniqueCuisines = new Set(rankedEntries.map(e => e.cuisineName));
        return {
            period,
            totalEntries: rankedEntries.length,
            totalUsers: uniqueUsers.size,
            totalCuisines: uniqueCuisines.size,
            entries: rankedEntries,
        };
    }
    async getUserUnlockedDishes(userId, limit = 50, offset = 0) {
        const countResult = await this.prisma.$queryRaw `
      SELECT COUNT(*) as count
      FROM dish_unlocks
      WHERE "userId" = ${userId}
    `;
        const totalDishes = Number(countResult[0]?.count || 0);
        const result = await this.prisma.$queryRaw `
      SELECT
        u.id as "userId",
        u.username,
        u."avatarUrl",
        du."dishName",
        du."mealCount",
        du."firstMealAt",
        du."lastMealAt",
        COALESCE(m.cuisine, '未知') as cuisine,
        m."imageUrl",
        m.calories
      FROM users u
      INNER JOIN dish_unlocks du ON du."userId" = u.id
      LEFT JOIN LATERAL (
        SELECT cuisine, "imageUrl", calories
        FROM meals
        WHERE "userId" = ${userId}
          AND "foodName" = du."dishName"
          AND "deletedAt" IS NULL
        LIMIT 1
      ) m ON true
      WHERE u.id = ${userId}
        AND u."deletedAt" IS NULL
      ORDER BY du."mealCount" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
        if (result.length === 0) {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, username: true, avatarUrl: true },
            });
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            return {
                userId: user.id,
                username: user.username,
                avatarUrl: user.avatarUrl,
                totalDishes: 0,
                totalMeals: 0,
                dishes: [],
                offset,
                limit,
                hasMore: false,
            };
        }
        const firstRow = result[0];
        const dishes = result.map(row => ({
            dishName: row.dishName,
            cuisine: row.cuisine,
            mealCount: Number(row.mealCount),
            firstMealAt: row.firstMealAt.toISOString(),
            lastMealAt: row.lastMealAt?.toISOString() || row.firstMealAt.toISOString(),
            imageUrl: row.imageUrl || undefined,
            calories: row.calories || undefined,
        }));
        const totalMeals = dishes.reduce((sum, d) => sum + d.mealCount, 0);
        return {
            userId: firstRow.userId,
            username: firstRow.username,
            avatarUrl: firstRow.avatarUrl,
            totalDishes,
            totalMeals,
            dishes,
            offset,
            limit,
            hasMore: offset + limit < totalDishes,
        };
    }
    getDateRangeSql(period) {
        const now = new Date();
        let startDate;
        switch (period) {
            case client_1.RankingPeriod.WEEKLY:
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                break;
            case client_1.RankingPeriod.MONTHLY:
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                break;
            case client_1.RankingPeriod.YEARLY:
                startDate = new Date(now);
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            case client_1.RankingPeriod.ALL_TIME:
            default:
                startDate = undefined;
                break;
        }
        const startDateCondition = startDate
            ? client_1.Prisma.sql `AND m."createdAt" >= ${startDate}`
            : client_1.Prisma.empty;
        return { startDate, startDateCondition };
    }
};
exports.UserDetailsQuery = UserDetailsQuery;
exports.UserDetailsQuery = UserDetailsQuery = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UserDetailsQuery);
//# sourceMappingURL=user-details.query.js.map
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
var RankingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RankingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const cache_service_1 = require("../cache/cache.service");
const cache_stats_service_1 = require("../cache/cache-stats.service");
const cache_decorator_1 = require("../cache/cache.decorator");
const cache_constants_1 = require("../cache/cache.constants");
const ranking_query_dto_1 = require("./dto/ranking-query.dto");
let RankingService = RankingService_1 = class RankingService {
    prisma;
    cacheService;
    cacheStatsService;
    logger = new common_1.Logger(RankingService_1.name);
    constructor(prisma, cacheService, cacheStatsService) {
        this.prisma = prisma;
        this.cacheService = cacheService;
        this.cacheStatsService = cacheStatsService;
    }
    async getCuisineMasters(cuisineName, period = ranking_query_dto_1.RankingPeriod.ALL_TIME) {
        const { startDate } = this.getDateRange(period);
        const usersWithSettings = await this.prisma.user.findMany({
            where: {
                deletedAt: null,
                user_settings: {
                    hideRanking: false,
                },
            },
            select: {
                id: true,
                username: true,
                avatarUrl: true,
            },
        });
        const userIds = usersWithSettings.map(u => u.id);
        const userMap = new Map(usersWithSettings.map(u => [u.id, u]));
        const where = {
            userId: { in: userIds },
            deletedAt: null,
        };
        if (cuisineName) {
            where.cuisine = cuisineName;
        }
        if (startDate) {
            where.createdAt = { gte: startDate };
        }
        const meals = await this.prisma.meal.findMany({
            where,
            select: {
                userId: true,
                cuisine: true,
                createdAt: true,
            },
        });
        const userStats = new Map();
        for (const meal of meals) {
            const existing = userStats.get(meal.userId);
            if (!existing) {
                userStats.set(meal.userId, {
                    count: 1,
                    firstMealAt: new Date(meal.createdAt),
                    cuisines: new Set([meal.cuisine]),
                });
            }
            else {
                existing.count++;
                existing.cuisines.add(meal.cuisine);
            }
        }
        const rankings = [];
        for (const [userId, stats] of userStats.entries()) {
            const user = userMap.get(userId);
            if (user) {
                if (cuisineName) {
                    if (stats.cuisines.has(cuisineName)) {
                        const cuisineMeals = meals.filter(m => m.userId === userId && m.cuisine === cuisineName);
                        if (cuisineMeals.length > 0) {
                            const firstMeal = cuisineMeals.reduce((earliest, m) => new Date(m.createdAt) < new Date(earliest.createdAt) ? m : earliest);
                            rankings.push({
                                userId,
                                username: user.username,
                                avatarUrl: user.avatarUrl,
                                cuisineName: cuisineName,
                                mealCount: cuisineMeals.length,
                                firstMealAt: new Date(firstMeal.createdAt),
                            });
                        }
                    }
                }
                else {
                    rankings.push({
                        userId,
                        username: user.username,
                        avatarUrl: user.avatarUrl,
                        cuisineName: '全部菜系',
                        mealCount: stats.count,
                        firstMealAt: stats.firstMealAt,
                    });
                }
            }
        }
        rankings.sort((a, b) => {
            if (b.mealCount !== a.mealCount) {
                return b.mealCount - a.mealCount;
            }
            return a.firstMealAt.getTime() - b.firstMealAt.getTime();
        });
        const topRankings = rankings.slice(0, 100);
        const masters = topRankings.map((r, index) => ({
            rank: index + 1,
            userId: r.userId,
            username: r.username,
            avatarUrl: r.avatarUrl,
            cuisineName: r.cuisineName,
            mealCount: r.mealCount,
            firstMealAt: r.firstMealAt.toISOString(),
        }));
        return {
            cuisineName,
            period,
            masters,
        };
    }
    async getLeaderboard(period = ranking_query_dto_1.RankingPeriod.ALL_TIME, tier) {
        const { startDate } = this.getDateRange(period);
        const users = await this.prisma.user.findMany({
            where: {
                deletedAt: null,
                OR: [
                    { user_settings: { is: null } },
                    { user_settings: { hideRanking: false } },
                ],
                ...(tier && { subscriptionTier: tier }),
            },
            select: {
                id: true,
                username: true,
                avatarUrl: true,
            },
        });
        const userIds = users.map(u => u.id);
        const userMap = new Map(users.map(u => [u.id, u]));
        const where = {
            userId: { in: userIds },
            deletedAt: null,
        };
        if (startDate) {
            where.createdAt = { gte: startDate };
        }
        const meals = await this.prisma.meal.findMany({
            where,
            select: {
                userId: true,
                cuisine: true,
                calories: true,
            },
        });
        const userStats = new Map();
        for (const meal of meals) {
            const existing = userStats.get(meal.userId);
            if (!existing) {
                userStats.set(meal.userId, {
                    mealCount: 1,
                    cuisineSet: new Set([meal.cuisine]),
                    totalCalories: meal.calories || 0,
                });
            }
            else {
                existing.mealCount++;
                existing.cuisineSet.add(meal.cuisine);
                existing.totalCalories += meal.calories || 0;
            }
        }
        const rankings = [];
        for (const [userId, stats] of userStats.entries()) {
            const user = userMap.get(userId);
            if (user) {
                const score = stats.mealCount * 10 + stats.cuisineSet.size * 50;
                rankings.push({
                    rank: 0,
                    userId,
                    username: user.username,
                    avatarUrl: user.avatarUrl,
                    score,
                    mealCount: stats.mealCount,
                    cuisineCount: stats.cuisineSet.size,
                });
            }
        }
        rankings.sort((a, b) => b.score - a.score);
        rankings.forEach((r, index) => {
            r.rank = index + 1;
        });
        const topRankings = rankings.slice(0, 100);
        return {
            period,
            tier,
            leaderboard: topRankings,
        };
    }
    async getRankingStats(period = ranking_query_dto_1.RankingPeriod.ALL_TIME) {
        const { startDate } = this.getDateRange(period);
        const [totalUsers, activeUsersData, totalMealsData] = await Promise.all([
            this.prisma.user.count({
                where: {
                    deletedAt: null,
                    OR: [
                        { user_settings: { is: null } },
                        { user_settings: { hideRanking: false } },
                    ],
                },
            }),
            this.prisma.user.findMany({
                where: {
                    deletedAt: null,
                    OR: [
                        { user_settings: { is: null } },
                        { user_settings: { hideRanking: false } },
                    ],
                },
                select: { id: true },
            }),
            this.prisma.meal.findMany({
                where: {
                    deletedAt: null,
                    ...(startDate && { createdAt: { gte: startDate } }),
                },
                select: { userId: true, cuisine: true },
            }),
        ]);
        const userIds = new Set(activeUsersData.map(u => u.id));
        const activeUserIds = new Set(totalMealsData.map(m => m.userId));
        const activeUsers = [...userIds].filter(id => activeUserIds.has(id)).length;
        const cuisineSet = new Set(totalMealsData.map(m => m.cuisine));
        const avgMealsPerUser = totalUsers > 0 ? totalMealsData.length / totalUsers : 0;
        return {
            period,
            totalUsers,
            activeUsers,
            totalMeals: totalMealsData.length,
            totalCuisines: cuisineSet.size,
            avgMealsPerUser: Math.round(avgMealsPerUser * 100) / 100,
        };
    }
    async getGourmets(period = ranking_query_dto_1.RankingPeriod.ALL_TIME) {
        const { startDate } = this.getDateRange(period);
        const users = await this.prisma.user.findMany({
            where: {
                deletedAt: null,
                OR: [
                    { user_settings: { is: null } },
                    { user_settings: { hideRanking: false } },
                ],
            },
            select: {
                id: true,
                username: true,
                avatarUrl: true,
            },
        });
        const userMap = new Map(users.map(u => [u.id, u]));
        const where = {
            userId: { in: Array.from(userMap.keys()) },
            deletedAt: null,
        };
        if (startDate) {
            where.createdAt = { gte: startDate };
        }
        const meals = await this.prisma.meal.findMany({
            where,
            select: {
                userId: true,
                cuisine: true,
            },
        });
        const userCuisineStats = new Map();
        for (const meal of meals) {
            const existing = userCuisineStats.get(meal.userId);
            if (!existing) {
                userCuisineStats.set(meal.userId, {
                    cuisineSet: new Set([meal.cuisine]),
                    mealCount: 1,
                });
            }
            else {
                existing.cuisineSet.add(meal.cuisine);
                existing.mealCount++;
            }
        }
        const gourmets = [];
        for (const [userId, stats] of userCuisineStats.entries()) {
            const user = userMap.get(userId);
            if (user) {
                gourmets.push({
                    rank: 0,
                    userId,
                    username: user.username,
                    avatarUrl: user.avatarUrl,
                    cuisineCount: stats.cuisineSet.size,
                    mealCount: stats.mealCount,
                    cuisines: Array.from(stats.cuisineSet),
                });
            }
        }
        gourmets.sort((a, b) => b.cuisineCount - a.cuisineCount);
        gourmets.forEach((g, index) => {
            g.rank = index + 1;
        });
        const topGourmets = gourmets.slice(0, 100);
        return {
            period,
            gourmets: topGourmets,
        };
    }
    async getDishExperts(period = ranking_query_dto_1.RankingPeriod.ALL_TIME) {
        const { startDate } = this.getDateRange(period);
        const users = await this.prisma.user.findMany({
            where: {
                deletedAt: null,
                OR: [
                    { user_settings: { is: null } },
                    { user_settings: { hideRanking: false } },
                ],
            },
            select: {
                id: true,
                username: true,
                avatarUrl: true,
            },
        });
        const userIds = users.map(u => u.id);
        const userMap = new Map(users.map(u => [u.id, u]));
        const where = {
            userId: { in: userIds },
        };
        if (startDate) {
            where.firstMealAt = { gte: startDate };
        }
        const unlocks = await this.prisma.dish_unlocks.findMany({
            where,
            select: {
                userId: true,
                dishName: true,
                mealCount: true,
            }
        });
        const dishNames = unlocks.map(u => u.dishName);
        const mealsForCuisine = await this.prisma.meal.findMany({
            where: {
                foodName: { in: dishNames },
                deletedAt: null,
            },
            select: {
                foodName: true,
                cuisine: true,
            },
            distinct: ['foodName', 'cuisine'],
        });
        const dishToCuisines = new Map();
        for (const meal of mealsForCuisine) {
            if (!dishToCuisines.has(meal.foodName)) {
                dishToCuisines.set(meal.foodName, new Set());
            }
            dishToCuisines.get(meal.foodName).add(meal.cuisine);
        }
        const userStats = new Map();
        for (const unlock of unlocks) {
            const existing = userStats.get(unlock.userId);
            const dishCuisines = dishToCuisines.get(unlock.dishName) || new Set();
            if (!existing) {
                userStats.set(unlock.userId, {
                    count: 1,
                    totalMeals: unlock.mealCount,
                    dishes: [unlock.dishName],
                    cuisines: dishCuisines,
                });
            }
            else {
                existing.count++;
                existing.totalMeals += unlock.mealCount;
                existing.dishes.push(unlock.dishName);
                dishCuisines.forEach(c => existing.cuisines.add(c));
            }
        }
        const experts = [];
        for (const [userId, stats] of userStats.entries()) {
            const user = userMap.get(userId);
            if (user) {
                experts.push({
                    rank: 0,
                    userId,
                    username: user.username,
                    avatarUrl: user.avatarUrl,
                    dishCount: stats.count,
                    mealCount: stats.totalMeals,
                    dishes: stats.dishes.slice(0, 10),
                    cuisines: Array.from(stats.cuisines).sort(),
                });
            }
        }
        experts.sort((a, b) => b.dishCount - a.dishCount);
        experts.forEach((e, index) => {
            e.rank = index + 1;
        });
        const topExperts = experts.slice(0, 100);
        return {
            period,
            experts: topExperts,
        };
    }
    getDateRange(period) {
        const now = new Date();
        let startDate;
        switch (period) {
            case ranking_query_dto_1.RankingPeriod.WEEKLY:
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                break;
            case ranking_query_dto_1.RankingPeriod.MONTHLY:
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                break;
            case ranking_query_dto_1.RankingPeriod.YEARLY:
                startDate = new Date(now);
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            case ranking_query_dto_1.RankingPeriod.ALL_TIME:
            default:
                startDate = undefined;
                break;
        }
        return { startDate };
    }
    async getCuisineExpertDetail(userId, cuisineName, period = ranking_query_dto_1.RankingPeriod.ALL_TIME) {
        const { startDate } = this.getDateRange(period);
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                avatarUrl: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const dateFilter = startDate
            ? `AND m."createdAt" >= '${startDate.toISOString()}'`
            : '';
        const dishes = await this.prisma.$queryRaw `
      SELECT
        m."foodName" AS dishname,
        m.cuisine,
        COUNT(*) AS mealcount,
        MIN(m."createdAt") AS firstmealat,
        MAX(m."createdAt") AS lastmealat,
        MAX(m."imageUrl") AS imageurl,
        MAX(m.calories) AS calories,
        MAX(m.notes) AS notes
      FROM meals m
      WHERE m."userId" = ${userId}
        AND m.cuisine = ${cuisineName}
        AND m."deletedAt" IS NULL
        ${dateFilter}
      GROUP BY m."foodName", m.cuisine
      ORDER BY mealcount DESC
    `;
        if (dishes.length === 0) {
            return {
                userId: user.id,
                username: user.username,
                avatarUrl: user.avatarUrl,
                cuisineName,
                period,
                totalDishes: 0,
                totalMeals: 0,
                dishes: [],
            };
        }
        const totalMeals = dishes.reduce((sum, d) => sum + Number(d.mealcount), 0);
        const dishEntries = dishes.map(d => ({
            dishName: d.dishname,
            cuisine: d.cuisine,
            mealCount: Number(d.mealcount),
            firstMealAt: new Date(d.firstmealat).toISOString(),
            lastMealAt: new Date(d.lastmealat).toISOString(),
            imageUrl: d.imageurl || undefined,
            calories: d.calories || undefined,
            notes: d.notes || undefined,
        }));
        return {
            userId: user.id,
            username: user.username,
            avatarUrl: user.avatarUrl,
            cuisineName,
            period,
            totalDishes: dishes.length,
            totalMeals,
            dishes: dishEntries,
        };
    }
    async getAllUsersDishes(period = ranking_query_dto_1.RankingPeriod.WEEKLY) {
        const { startDate } = this.getDateRange(period);
        const allUsers = await this.prisma.user.findMany({
            where: {
                deletedAt: null,
                OR: [
                    { user_settings: { is: null } },
                    { user_settings: { hideRanking: false } },
                ],
            },
            select: {
                id: true,
                username: true,
                avatarUrl: true,
            },
        });
        const userIds = allUsers.map(u => u.id);
        const userMap = new Map(allUsers.map(u => [u.id, u]));
        const where = {
            userId: { in: userIds },
            deletedAt: null,
        };
        if (startDate) {
            where.createdAt = { gte: startDate };
        }
        const meals = await this.prisma.meal.findMany({
            where,
            select: {
                userId: true,
                foodName: true,
                cuisine: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        const userCuisineStats = new Map();
        for (const meal of meals) {
            const key = `${meal.userId}|${meal.cuisine}`;
            let entry = userCuisineStats.get(key);
            if (!entry) {
                const user = userMap.get(meal.userId);
                if (!user)
                    continue;
                entry = {
                    userId: meal.userId,
                    username: user.username,
                    avatarUrl: user.avatarUrl,
                    cuisineName: meal.cuisine,
                    dishSet: new Set(),
                    mealCount: 0,
                    firstMealAt: new Date(meal.createdAt),
                };
                userCuisineStats.set(key, entry);
            }
            entry.dishSet.add(meal.foodName);
            entry.mealCount++;
        }
        const entries = [];
        for (const stats of userCuisineStats.values()) {
            entries.push({
                rank: 0,
                userId: stats.userId,
                username: stats.username,
                avatarUrl: stats.avatarUrl,
                cuisineName: stats.cuisineName,
                dishCount: stats.dishSet.size,
                mealCount: stats.mealCount,
                firstMealAt: stats.firstMealAt.toISOString(),
            });
        }
        entries.sort((a, b) => {
            if (b.dishCount !== a.dishCount) {
                return b.dishCount - a.dishCount;
            }
            return new Date(a.firstMealAt).getTime() - new Date(b.firstMealAt).getTime();
        });
        entries.forEach((e, index) => {
            e.rank = index + 1;
        });
        const uniqueUsers = new Set(entries.map(e => e.userId));
        const uniqueCuisines = new Set(entries.map(e => e.cuisineName));
        return {
            period,
            totalEntries: entries.length,
            totalUsers: uniqueUsers.size,
            totalCuisines: uniqueCuisines.size,
            entries,
        };
    }
    async getUserUnlockedDishes(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                avatarUrl: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const dishes = await this.prisma.$queryRaw `
      SELECT
        du."dishName" AS dishname,
        du."mealCount" AS mealcount,
        du."firstMealAt" AS firstmealat,
        du."lastMealAt" AS lastmealat,
        m.cuisine,
        m."imageUrl" AS imageurl,
        m.calories
      FROM dish_unlocks du
      LEFT JOIN LATERAL (
        SELECT
          m2.cuisine,
          m2."imageUrl",
          m2.calories
        FROM meals m2
        WHERE m2."userId" = du."userId"
          AND m2."foodName" = du."dishName"
          AND m2."deletedAt" IS NULL
        ORDER BY m2."createdAt" DESC
        LIMIT 1
      ) m ON true
      WHERE du."userId" = ${userId}
      ORDER BY du."mealCount" DESC
    `;
        const dishEntries = dishes.map(d => ({
            dishName: d.dishname,
            cuisine: d.cuisine || '未知',
            mealCount: d.mealcount,
            firstMealAt: new Date(d.firstmealat).toISOString(),
            lastMealAt: new Date(d.lastmealat).toISOString(),
            imageUrl: d.imageurl || undefined,
            calories: d.calories || undefined,
        }));
        const totalMeals = dishes.reduce((sum, d) => sum + d.mealcount, 0);
        return {
            userId: user.id,
            username: user.username,
            avatarUrl: user.avatarUrl,
            totalDishes: dishes.length,
            totalMeals,
            dishes: dishEntries,
        };
    }
};
exports.RankingService = RankingService;
__decorate([
    (0, cache_decorator_1.Cacheable)('ranking:cuisine_masters', ['cuisineName', 'period'], cache_constants_1.CacheTTL.MEDIUM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RankingService.prototype, "getCuisineMasters", null);
__decorate([
    (0, cache_decorator_1.Cacheable)('ranking:leaderboard', ['period', 'tier'], cache_constants_1.CacheTTL.MEDIUM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RankingService.prototype, "getLeaderboard", null);
__decorate([
    (0, cache_decorator_1.Cacheable)('ranking:stats', ['period'], cache_constants_1.CacheTTL.MEDIUM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RankingService.prototype, "getRankingStats", null);
__decorate([
    (0, cache_decorator_1.Cacheable)('ranking:gourmets', ['period'], cache_constants_1.CacheTTL.MEDIUM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RankingService.prototype, "getGourmets", null);
__decorate([
    (0, cache_decorator_1.Cacheable)('ranking:dish_experts', ['period'], cache_constants_1.CacheTTL.MEDIUM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RankingService.prototype, "getDishExperts", null);
exports.RankingService = RankingService = RankingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService,
        cache_stats_service_1.CacheStatsService])
], RankingService);
//# sourceMappingURL=ranking.service.js.map
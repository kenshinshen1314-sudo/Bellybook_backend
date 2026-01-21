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
    async getCuisineExpertDetail(userId, cuisineName, period) {
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
        const where = {
            userId,
            cuisine: cuisineName,
            deletedAt: null,
        };
        if (startDate) {
            where.createdAt = { gte: startDate };
        }
        const meals = await this.prisma.meal.findMany({
            where,
            select: {
                foodName: true,
                cuisine: true,
                createdAt: true,
                imageUrl: true,
                calories: true,
                notes: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        if (meals.length === 0) {
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
        const dishStats = new Map();
        for (const meal of meals) {
            const existing = dishStats.get(meal.foodName);
            if (!existing) {
                dishStats.set(meal.foodName, {
                    dishName: meal.foodName,
                    cuisine: meal.cuisine,
                    mealCount: 1,
                    firstMealAt: new Date(meal.createdAt).toISOString(),
                    lastMealAt: new Date(meal.createdAt).toISOString(),
                    imageUrl: meal.imageUrl,
                    calories: meal.calories || undefined,
                    notes: meal.notes || undefined,
                });
            }
            else {
                existing.mealCount++;
                existing.lastMealAt = new Date(meal.createdAt).toISOString();
            }
        }
        const dishes = Array.from(dishStats.values()).sort((a, b) => b.mealCount - a.mealCount);
        return {
            userId: user.id,
            username: user.username,
            avatarUrl: user.avatarUrl,
            cuisineName,
            period,
            totalDishes: dishes.length,
            totalMeals: meals.length,
            dishes,
        };
    }
    async getAllUsersDishes(period) {
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
        entries.forEach((e, index) => { e.rank = index + 1; });
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
        const unlocks = await this.prisma.dish_unlocks.findMany({
            where: { userId },
            select: {
                dishName: true,
                mealCount: true,
                firstMealAt: true,
                lastMealAt: true,
            },
            orderBy: { lastMealAt: 'desc' },
        });
        const dishNames = unlocks.map(u => u.dishName);
        const mealsInfo = await this.prisma.meal.findMany({
            where: {
                foodName: { in: dishNames },
                userId,
                deletedAt: null,
            },
            select: {
                foodName: true,
                cuisine: true,
                imageUrl: true,
                calories: true,
            },
            distinct: ['foodName'],
        });
        const dishInfoMap = new Map();
        for (const meal of mealsInfo) {
            dishInfoMap.set(meal.foodName, {
                cuisine: meal.cuisine,
                imageUrl: meal.imageUrl || undefined,
                calories: meal.calories || undefined,
            });
        }
        const dishes = unlocks.map(unlock => {
            const info = dishInfoMap.get(unlock.dishName);
            return {
                dishName: unlock.dishName,
                cuisine: info?.cuisine || '未知',
                mealCount: unlock.mealCount,
                firstMealAt: unlock.firstMealAt.toISOString(),
                lastMealAt: unlock.lastMealAt?.toISOString() || unlock.firstMealAt.toISOString(),
                imageUrl: info?.imageUrl,
                calories: info?.calories,
            };
        });
        dishes.sort((a, b) => b.mealCount - a.mealCount);
        const totalMeals = dishes.reduce((sum, d) => sum + d.mealCount, 0);
        return {
            userId: user.id,
            username: user.username,
            avatarUrl: user.avatarUrl,
            totalDishes: dishes.length,
            totalMeals,
            dishes,
        };
    }
    getDateRange(period) {
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
        return { startDate };
    }
};
exports.UserDetailsQuery = UserDetailsQuery;
exports.UserDetailsQuery = UserDetailsQuery = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UserDetailsQuery);
//# sourceMappingURL=user-details.query.js.map
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
const ranking_query_dto_1 = require("./dto/ranking-query.dto");
let RankingService = RankingService_1 = class RankingService {
    prisma;
    logger = new common_1.Logger(RankingService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
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
        const totalMeals = meals.length;
        const totalDishes = dishes.length;
        return {
            userId: user.id,
            username: user.username,
            avatarUrl: user.avatarUrl,
            cuisineName,
            period,
            totalDishes,
            totalMeals,
            dishes,
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
};
exports.RankingService = RankingService;
exports.RankingService = RankingService = RankingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RankingService);
//# sourceMappingURL=ranking.service.js.map
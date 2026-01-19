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
                user_settings: {
                    hideRanking: false,
                },
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
                    user_settings: {
                        hideRanking: false,
                    },
                },
            }),
            this.prisma.user.findMany({
                where: {
                    deletedAt: null,
                    user_settings: {
                        hideRanking: false,
                    },
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
                foodName: true,
            },
        });
        const userDishStats = new Map();
        for (const meal of meals) {
            const existing = userDishStats.get(meal.userId);
            if (!existing) {
                userDishStats.set(meal.userId, {
                    dishSet: new Set([meal.foodName]),
                    mealCount: 1,
                });
            }
            else {
                existing.dishSet.add(meal.foodName);
                existing.mealCount++;
            }
        }
        const experts = [];
        for (const [userId, stats] of userDishStats.entries()) {
            const user = userMap.get(userId);
            if (user) {
                experts.push({
                    rank: 0,
                    userId,
                    username: user.username,
                    avatarUrl: user.avatarUrl,
                    dishCount: stats.dishSet.size,
                    mealCount: stats.mealCount,
                    dishes: Array.from(stats.dishSet),
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
};
exports.RankingService = RankingService;
exports.RankingService = RankingService = RankingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RankingService);
//# sourceMappingURL=ranking.service.js.map
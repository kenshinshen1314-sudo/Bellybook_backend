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
var RankingOptimizedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RankingOptimizedService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const client_1 = require("@prisma/client");
const CACHE_TTL_MINUTES = 5;
let RankingOptimizedService = RankingOptimizedService_1 = class RankingOptimizedService {
    prisma;
    logger = new common_1.Logger(RankingOptimizedService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCuisineMasters(cuisineName, period = client_1.RankingPeriod.ALL_TIME) {
        const cacheKey = this.buildCacheKey('cuisine_masters', period, cuisineName);
        const cached = await this.getCache(cacheKey);
        if (cached) {
            this.logger.debug(`Cache hit: ${cacheKey}`);
            return cached;
        }
        const { startDate } = this.getDateRange(period);
        const [mealAggregates, userMap] = await Promise.all([
            this.prisma.meal.groupBy({
                by: ['userId', 'cuisine'],
                where: this.buildMealWhere(startDate, cuisineName),
                _count: { id: true },
                _min: { createdAt: true },
            }),
            this.getUserMap(),
        ]);
        const rankings = [];
        for (const aggregate of mealAggregates) {
            const user = userMap.get(aggregate.userId);
            if (!user)
                continue;
            if (cuisineName) {
                if (aggregate.cuisine === cuisineName) {
                    rankings.push({
                        userId: aggregate.userId,
                        cuisineName: aggregate.cuisine,
                        mealCount: aggregate._count.id,
                        firstMealAt: aggregate._min.createdAt,
                    });
                }
            }
            else {
                rankings.push({
                    userId: aggregate.userId,
                    cuisineName: '全部菜系',
                    mealCount: aggregate._count.id,
                    firstMealAt: aggregate._min.createdAt,
                });
            }
        }
        rankings.sort((a, b) => {
            if (b.mealCount !== a.mealCount) {
                return b.mealCount - a.mealCount;
            }
            return a.firstMealAt.getTime() - b.firstMealAt.getTime();
        });
        const masters = rankings.slice(0, 100).map((r, index) => {
            const user = userMap.get(r.userId);
            return {
                rank: index + 1,
                userId: r.userId,
                username: user.username,
                avatarUrl: user.avatarUrl,
                cuisineName: r.cuisineName,
                mealCount: r.mealCount,
                firstMealAt: r.firstMealAt.toISOString(),
            };
        });
        const result = {
            cuisineName,
            period,
            masters,
        };
        await this.setCache(cacheKey, result);
        return result;
    }
    async getLeaderboard(period = client_1.RankingPeriod.ALL_TIME, tier) {
        const cacheKey = this.buildCacheKey('leaderboard', period, tier);
        const cached = await this.getCache(cacheKey);
        if (cached) {
            this.logger.debug(`Cache hit: ${cacheKey}`);
            return cached;
        }
        const { startDate } = this.getDateRange(period);
        const mealCounts = await this.prisma.meal.groupBy({
            by: ['userId'],
            where: this.buildMealWhere(startDate),
            _count: { id: true },
            _sum: { calories: true },
        });
        const cuisineCounts = await this.prisma.meal.groupBy({
            by: ['userId'],
            where: this.buildMealWhere(startDate),
            _count: { cuisine: true },
        });
        const uniqueCuisineCounts = await this.prisma.$queryRaw `
      SELECT "userId", COUNT(DISTINCT "cuisine") as count
      FROM "meals"
      WHERE "deletedAt" IS NULL
        ${startDate ? client_1.Prisma.sql `AND "createdAt" >= ${startDate}` : client_1.Prisma.empty}
      GROUP BY "userId"
    `;
        const userMap = await this.getUserMap();
        const mealCountMap = new Map(mealCounts.map(m => [m.userId, m._count.id]));
        const cuisineCountMap = new Map(uniqueCuisineCounts.map(m => [m.userId, Number(m.count)]));
        const rankings = [];
        for (const [userId, mealCount] of mealCountMap) {
            const user = userMap.get(userId);
            if (!user)
                continue;
            if (tier) {
            }
            const cuisineCount = cuisineCountMap.get(userId) || 0;
            const score = mealCount * 10 + cuisineCount * 50;
            rankings.push({
                rank: 0,
                userId,
                username: user.username,
                avatarUrl: user.avatarUrl,
                score,
                mealCount,
                cuisineCount,
            });
        }
        rankings.sort((a, b) => b.score - a.score);
        rankings.forEach((r, index) => { r.rank = index + 1; });
        const result = {
            period,
            tier,
            leaderboard: rankings.slice(0, 100),
        };
        await this.setCache(cacheKey, result);
        return result;
    }
    async getRankingStats(period = client_1.RankingPeriod.ALL_TIME) {
        const cacheKey = this.buildCacheKey('stats', period);
        const cached = await this.getCache(cacheKey);
        if (cached) {
            return cached;
        }
        const { startDate } = this.getDateRange(period);
        const [totalUsers, totalMeals, uniqueCuisines] = await Promise.all([
            this.prisma.user.count({
                where: {
                    deletedAt: null,
                    OR: [
                        { user_settings: { is: null } },
                        { user_settings: { hideRanking: false } },
                    ],
                },
            }),
            this.prisma.meal.count({
                where: {
                    deletedAt: null,
                    ...(startDate && { createdAt: { gte: startDate } }),
                },
            }),
            this.prisma.meal.findMany({
                where: {
                    deletedAt: null,
                    ...(startDate && { createdAt: { gte: startDate } }),
                },
                select: { cuisine: true },
                distinct: ['cuisine'],
            }),
        ]);
        const activeUsers = await this.prisma.$queryRaw `
      SELECT COUNT(DISTINCT "userId") as count
      FROM "meals"
      WHERE "deletedAt" IS NULL
        ${startDate ? client_1.Prisma.sql `AND "createdAt" >= ${startDate}` : client_1.Prisma.empty}
    `;
        const avgMealsPerUser = totalUsers > 0 ? totalMeals / totalUsers : 0;
        const result = {
            period,
            totalUsers,
            activeUsers: Number(activeUsers[0]?.count || 0),
            totalMeals,
            totalCuisines: uniqueCuisines.length,
            avgMealsPerUser: Math.round(avgMealsPerUser * 100) / 100,
        };
        await this.setCache(cacheKey, result);
        return result;
    }
    async getGourmets(period = client_1.RankingPeriod.ALL_TIME) {
        const cacheKey = this.buildCacheKey('gourmets', period);
        const cached = await this.getCache(cacheKey);
        if (cached) {
            return cached;
        }
        const { startDate } = this.getDateRange(period);
        const stats = await this.prisma.$queryRaw `
      SELECT
        "userId",
        COUNT(DISTINCT "cuisine") as "cuisineCount",
        COUNT(*) as "mealCount"
      FROM "meals"
      WHERE "deletedAt" IS NULL
        ${startDate ? client_1.Prisma.sql `AND "createdAt" >= ${startDate}` : client_1.Prisma.empty}
      GROUP BY "userId"
    `;
        const userMap = await this.getUserMap();
        const gourmets = [];
        for (const stat of stats) {
            const user = userMap.get(stat.userId);
            if (!user)
                continue;
            gourmets.push({
                rank: 0,
                userId: stat.userId,
                username: user.username,
                avatarUrl: user.avatarUrl,
                cuisineCount: Number(stat.cuisineCount),
                mealCount: Number(stat.mealCount),
                cuisines: [],
            });
        }
        gourmets.sort((a, b) => b.cuisineCount - a.cuisineCount);
        gourmets.forEach((g, index) => { g.rank = index + 1; });
        const result = {
            period,
            gourmets: gourmets.slice(0, 100),
        };
        await this.setCache(cacheKey, result);
        return result;
    }
    async getDishExperts(period = client_1.RankingPeriod.ALL_TIME) {
        const cacheKey = this.buildCacheKey('dish_experts', period);
        const cached = await this.getCache(cacheKey);
        if (cached) {
            return cached;
        }
        const { startDate } = this.getDateRange(period);
        const unlocks = await this.prisma.dish_unlocks.findMany({
            where: startDate ? { firstMealAt: { gte: startDate } } : {},
            select: {
                userId: true,
                dishName: true,
                mealCount: true,
            },
        });
        const userStats = new Map();
        for (const unlock of unlocks) {
            const existing = userStats.get(unlock.userId);
            if (!existing) {
                userStats.set(unlock.userId, {
                    count: 1,
                    totalMeals: unlock.mealCount,
                    dishes: [unlock.dishName],
                });
            }
            else {
                existing.count++;
                existing.totalMeals += unlock.mealCount;
                existing.dishes.push(unlock.dishName);
            }
        }
        const userMap = await this.getUserMap();
        const experts = [];
        for (const [userId, stats] of userStats.entries()) {
            const user = userMap.get(userId);
            if (!user)
                continue;
            experts.push({
                rank: 0,
                userId,
                username: user.username,
                avatarUrl: user.avatarUrl,
                dishCount: stats.count,
                mealCount: stats.totalMeals,
                dishes: stats.dishes.slice(0, 10),
                cuisines: [],
            });
        }
        experts.sort((a, b) => b.dishCount - a.dishCount);
        experts.forEach((e, index) => { e.rank = index + 1; });
        const result = {
            period,
            experts: experts.slice(0, 100),
        };
        await this.setCache(cacheKey, result);
        return result;
    }
    buildMealWhere(startDate, cuisineName) {
        const where = {
            deletedAt: null,
            users: {
                OR: [
                    { user_settings: { is: null } },
                    { user_settings: { hideRanking: false } },
                ],
            },
        };
        if (startDate) {
            where.createdAt = { gte: startDate };
        }
        if (cuisineName) {
            where.cuisine = cuisineName;
        }
        return where;
    }
    async getUserMap() {
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
        return new Map(users.map(u => [u.id, { username: u.username, avatarUrl: u.avatarUrl }]));
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
    buildCacheKey(type, period, suffix) {
        const parts = [type, period];
        if (suffix)
            parts.push(suffix);
        return parts.join(':');
    }
    async getCache(key) {
        const cache = await this.prisma.ranking_caches.findUnique({
            where: { id: key },
        });
        if (!cache)
            return null;
        if (cache.expiresAt < new Date()) {
            await this.prisma.ranking_caches.delete({ where: { id: key } });
            return null;
        }
        return cache.rankings;
    }
    async setCache(key, data) {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + CACHE_TTL_MINUTES);
        await this.prisma.ranking_caches.upsert({
            where: { id: key },
            create: {
                id: key,
                period: client_1.RankingPeriod.ALL_TIME,
                rankings: data,
                expiresAt,
            },
            update: {
                rankings: data,
                expiresAt,
                updatedAt: new Date(),
            },
        });
    }
    async getCuisineExpertDetail(userId, cuisineName, period = client_1.RankingPeriod.ALL_TIME) {
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
    async getAllUsersDishes(period = client_1.RankingPeriod.WEEKLY) {
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
};
exports.RankingOptimizedService = RankingOptimizedService;
exports.RankingOptimizedService = RankingOptimizedService = RankingOptimizedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RankingOptimizedService);
//# sourceMappingURL=ranking-optimized.service.js.map
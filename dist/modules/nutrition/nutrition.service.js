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
exports.NutritionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const cache_service_1 = require("../cache/cache.service");
const cache_constants_1 = require("../cache/cache.constants");
let NutritionService = class NutritionService {
    prisma;
    cacheService;
    constructor(prisma, cacheService) {
        this.prisma = prisma;
        this.cacheService = cacheService;
    }
    async getDaily(userId, date) {
        const queryDate = date || new Date();
        const startOfDay = new Date(queryDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isToday = startOfDay.getTime() === today.getTime();
        const cacheKey = `${cache_constants_1.CachePrefix.DAILY_NUTRITION}:${userId}:${startOfDay.toISOString().split('T')[0]}`;
        if (!isToday) {
            const cached = await this.cacheService.get(cacheKey);
            if (cached)
                return cached;
        }
        const [daily, meals] = await Promise.all([
            this.prisma.daily_nutritions.findUnique({
                where: {
                    userId_date: { userId, date: startOfDay },
                },
            }),
            this.prisma.meal.findMany({
                where: {
                    userId,
                    createdAt: { gte: startOfDay, lt: endOfDay },
                    deletedAt: null,
                },
                select: {
                    id: true,
                    userId: true,
                    imageUrl: true,
                    thumbnailUrl: true,
                    analysis: true,
                    mealType: true,
                    notes: true,
                    createdAt: true,
                    updatedAt: true,
                    isSynced: true,
                    version: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        const result = {
            date: startOfDay.toISOString().split('T')[0],
            totalCalories: daily?.totalCalories || 0,
            totalProtein: daily?.totalProtein || 0,
            totalFat: daily?.totalFat || 0,
            totalCarbohydrates: daily?.totalCarbohydrates || 0,
            totalFiber: daily?.totalFiber || 0,
            totalSugar: daily?.totalSugar || 0,
            totalSodium: daily?.totalSodium || 0,
            mealCount: daily?.mealCount || 0,
            breakfastCount: daily?.breakfastCount || 0,
            lunchCount: daily?.lunchCount || 0,
            dinnerCount: daily?.dinnerCount || 0,
            snackCount: daily?.snackCount || 0,
            meals: meals.map(m => ({
                id: m.id,
                userId: m.userId,
                imageUrl: m.imageUrl,
                thumbnailUrl: m.thumbnailUrl ?? undefined,
                analysis: m.analysis,
                mealType: m.mealType,
                notes: m.notes ?? undefined,
                createdAt: m.createdAt,
                updatedAt: m.updatedAt,
                isSynced: m.isSynced,
                version: m.version,
            })),
        };
        if (!isToday) {
            await this.cacheService.set(cacheKey, result, cache_constants_1.CacheTTL.LONG);
        }
        return result;
    }
    async getWeekly(userId, startDate, endDate) {
        const end = endDate || new Date();
        const start = startDate || new Date(end);
        if (!startDate) {
            start.setDate(start.getDate() - 7);
        }
        const dailies = await this.prisma.daily_nutritions.findMany({
            where: {
                userId,
                date: { gte: start, lte: end },
            },
            orderBy: { date: 'asc' },
        });
        const dailyData = dailies.map(d => ({
            date: d.date.toISOString().split('T')[0],
            calories: d.totalCalories,
            protein: d.totalProtein,
            fat: d.totalFat,
            carbohydrates: d.totalCarbohydrates,
        }));
        const totalMeals = dailies.reduce((sum, d) => sum + d.mealCount, 0);
        const daysCount = dailies.length || 1;
        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            dailyData,
            averages: {
                calories: this.sum(dailies.map(d => d.totalCalories)) / daysCount,
                protein: this.sum(dailies.map(d => d.totalProtein)) / daysCount,
                fat: this.sum(dailies.map(d => d.totalFat)) / daysCount,
                carbohydrates: this.sum(dailies.map(d => d.totalCarbohydrates)) / daysCount,
            },
            totalMeals,
        };
    }
    async getSummary(userId, period = 'week') {
        const cacheKey = `${cache_constants_1.CachePrefix.DAILY_NUTRITION}:summary:${userId}:${period}`;
        const cached = await this.cacheService.get(cacheKey);
        if (cached)
            return cached;
        const now = new Date();
        let startDate = new Date(now);
        switch (period) {
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            case 'all':
                startDate = new Date(0);
                break;
        }
        const [cuisineStats, mealStats, dailies] = await Promise.all([
            this.prisma.meal.groupBy({
                by: ['cuisine'],
                where: {
                    userId,
                    createdAt: { gte: startDate, lte: now },
                    deletedAt: null,
                },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 10,
            }),
            this.prisma.$queryRaw `
        SELECT "foodName", "cuisine", COUNT(*) as count
        FROM meals
        WHERE "userId" = ${userId}
          AND "createdAt" >= ${startDate}
          AND "createdAt" <= ${now}
          AND "deletedAt" IS NULL
        GROUP BY "foodName", "cuisine"
        ORDER BY count DESC
        LIMIT 10
      `,
            this.prisma.daily_nutritions.findMany({
                where: {
                    userId,
                    date: { gte: startDate, lte: now },
                },
            }),
        ]);
        const totalMeals = cuisineStats.reduce((sum, c) => sum + c._count.id, 0);
        const totalCalories = this.sum(dailies.map(d => d.totalCalories));
        const daysCount = dailies.length || 1;
        const topCuisines = cuisineStats.map(c => ({
            name: c.cuisine,
            count: c._count.id,
            percentage: totalMeals > 0 ? (c._count.id / totalMeals) * 100 : 0,
        }));
        const topMeals = mealStats.map(m => ({
            foodName: m.food_name,
            cuisine: m.cuisine,
            count: Number(m.count),
        }));
        const result = {
            period,
            startDate: startDate.toISOString().split('T')[0],
            endDate: now.toISOString().split('T')[0],
            totalMeals,
            totalCalories,
            averages: {
                calories: totalCalories / daysCount,
                protein: this.sum(dailies.map(d => d.totalProtein)) / daysCount,
                fat: this.sum(dailies.map(d => d.totalFat)) / daysCount,
                carbohydrates: this.sum(dailies.map(d => d.totalCarbohydrates)) / daysCount,
            },
            topCuisines,
            topMeals,
        };
        const ttl = period === 'week' ? cache_constants_1.CacheTTL.MEDIUM : cache_constants_1.CacheTTL.LONG;
        await this.cacheService.set(cacheKey, result, ttl);
        return result;
    }
    async getAverages(userId, period = 'week') {
        const now = new Date();
        let startDate = new Date(now);
        switch (period) {
            case 'day':
                startDate.setDate(startDate.getDate() - 1);
                break;
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
        }
        const dailies = await this.prisma.daily_nutritions.findMany({
            where: {
                userId,
                date: { gte: startDate, lte: now },
            },
        });
        const daysCount = dailies.length || 1;
        return {
            period,
            averages: {
                calories: this.sum(dailies.map(d => d.totalCalories)) / daysCount,
                protein: this.sum(dailies.map(d => d.totalProtein)) / daysCount,
                fat: this.sum(dailies.map(d => d.totalFat)) / daysCount,
                carbohydrates: this.sum(dailies.map(d => d.totalCarbohydrates)) / daysCount,
                fiber: this.sum(dailies.map(d => d.totalFiber)) / daysCount,
                sugar: this.sum(dailies.map(d => d.totalSugar)) / daysCount,
                sodium: this.sum(dailies.map(d => d.totalSodium)) / daysCount,
            },
            totalDays: daysCount,
        };
    }
    sum(numbers) {
        return numbers.reduce((a, b) => a + b, 0);
    }
    mapToMealResponse(meal) {
        return {
            id: meal.id,
            userId: meal.userId,
            imageUrl: meal.imageUrl,
            thumbnailUrl: meal.thumbnailUrl ?? undefined,
            analysis: meal.analysis,
            mealType: meal.mealType,
            notes: meal.notes ?? undefined,
            createdAt: meal.createdAt,
            updatedAt: meal.updatedAt,
            isSynced: meal.isSynced,
            version: meal.version,
        };
    }
};
exports.NutritionService = NutritionService;
exports.NutritionService = NutritionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService])
], NutritionService);
//# sourceMappingURL=nutrition.service.js.map
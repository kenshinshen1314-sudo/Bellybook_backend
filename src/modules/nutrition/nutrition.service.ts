import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DailyNutritionDto, WeeklyTrendsDto, NutritionSummaryDto, AverageNutritionDto } from './dto/nutrition-response.dto';
import { CacheService } from '../cache/cache.service';
import { CachePrefix, CacheTTL } from '../cache/cache.constants';
import type { Meal } from '@prisma/client';

// Simplified meal response type for nutrition module
export interface SimpleMealResponse {
  id: string;
  userId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  analysis: unknown;
  mealType: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  isSynced: boolean;
  version: number;
}

@Injectable()
export class NutritionService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async getDaily(userId: string, date?: Date): Promise<DailyNutritionDto> {
    const queryDate = date || new Date();
    const startOfDay = new Date(queryDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // 使用缓存 - 今天的数据缓存时间短，历史数据缓存时间长
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = startOfDay.getTime() === today.getTime();
    const cacheKey = `${CachePrefix.DAILY_NUTRITION}:${userId}:${startOfDay.toISOString().split('T')[0]}`;

    if (!isToday) {
      const cached = await this.cacheService.get<DailyNutritionDto>(cacheKey);
      if (cached) return cached;
    }

    const [daily, meals] = await Promise.all([
      this.prisma.daily_nutritions.findUnique({
        where: {
          userId_date: { userId, date: startOfDay },
        },
      }),
      // 只选择必要的字段
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

    const result: DailyNutritionDto = {
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

    // 历史数据缓存，今天的数据不缓存
    if (!isToday) {
      await this.cacheService.set(cacheKey, result, CacheTTL.LONG);
    }

    return result;
  }

  async getWeekly(userId: string, startDate?: Date, endDate?: Date): Promise<WeeklyTrendsDto> {
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

  async getSummary(userId: string, period: 'week' | 'month' | 'year' | 'all' = 'week'): Promise<NutritionSummaryDto> {
    // 使用缓存减少数据库查询
    const cacheKey = `${CachePrefix.DAILY_NUTRITION}:summary:${userId}:${period}`;
    const cached = await this.cacheService.get<NutritionSummaryDto>(cacheKey);
    if (cached) return cached;

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

    // 使用数据库聚合查询优化性能
    const [cuisineStats, mealStats, dailies] = await Promise.all([
      // 使用聚合查询获取菜系统计
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
      // 使用聚合查询获取菜品统计
      this.prisma.$queryRaw<Array<{ food_name: string; cuisine: string; count: bigint }>>`
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

    const result: NutritionSummaryDto = {
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

    // 缓存结果 (根据 period 设置不同的 TTL)
    const ttl = period === 'week' ? CacheTTL.MEDIUM : CacheTTL.LONG;
    await this.cacheService.set(cacheKey, result, ttl);

    return result;
  }

  async getAverages(userId: string, period: 'day' | 'week' | 'month' | 'year' = 'week'): Promise<AverageNutritionDto> {
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

  private sum(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0);
  }

  private mapToMealResponse(meal: Meal): SimpleMealResponse {
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
}

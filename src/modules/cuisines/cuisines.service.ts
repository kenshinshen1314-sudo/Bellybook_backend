import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CuisineConfigDto, CuisineUnlockDto, CuisineStatsDto, CuisineDetailDto, CuisineDetailStatsDto } from './dto/cuisine-response.dto';
import type { cuisine_configs, cuisine_unlocks } from '@prisma/client';
import { CacheService } from '../cache/cache.service';
import { CacheStatsService } from '../cache/cache-stats.service';
import { Cacheable } from '../cache/cache.decorator';
import { CachePrefix, CacheTTL } from '../cache/cache.constants';

@Injectable()
export class CuisinesService {
  constructor(
    private prisma: PrismaService,
    public cacheService: CacheService,
    public cacheStatsService: CacheStatsService,
  ) {}

  /**
   * 获取所有菜系配置
   * 缓存策略：菜系配置很少变化，使用长期缓存
   */
  @Cacheable(CachePrefix.CUISINE_CONFIGS, [], CacheTTL.DAILY)
  async findAll(): Promise<CuisineConfigDto[]> {
    const cuisines = await this.prisma.cuisine_configs.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    return cuisines.map(c => this.mapToCuisineConfig(c));
  }

  /**
   * 获取用户已解锁的菜系
   * 缓存策略：用户解锁数据变化较少，使用中等长度缓存
   */
  @Cacheable(CachePrefix.CUISINE_UNLOCKS, ['userId'], CacheTTL.MEDIUM)
  async findUnlocked(userId: string): Promise<CuisineUnlockDto[]> {
    const unlocks = await this.prisma.cuisine_unlocks.findMany({
      where: { userId },
      orderBy: { mealCount: 'desc' },
    });

    return unlocks.map(u => this.mapToCuisineUnlock(u));
  }

  /**
   * 获取用户菜系统计
   * 缓存策略：统计数据变化频率低，使用中等长度缓存
   */
  @Cacheable('cuisine:stats', ['userId'], CacheTTL.MEDIUM)
  async getStats(userId: string): Promise<CuisineStatsDto> {
    const [totalUnlocked, totalAvailable, topCuisines, recentUnlocks] = await Promise.all([
      this.prisma.cuisine_unlocks.count({ where: { userId } }),
      this.prisma.cuisine_configs.count(),
      this.prisma.cuisine_unlocks.findMany({
        where: { userId },
        orderBy: { mealCount: 'desc' },
        take: 5,
      }),
      this.prisma.cuisine_unlocks.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      totalUnlocked,
      totalAvailable,
      unlockProgress: totalAvailable > 0 ? totalUnlocked / totalAvailable : 0,
      topCuisines: topCuisines.map(c => ({
        name: c.cuisineName,
        count: c.mealCount,
      })),
      recentUnlocks: recentUnlocks.map(c => ({
        name: c.cuisineName,
        unlockedAt: c.firstMealAt,
      })),
    };
  }

  async findOne(userId: string, name: string): Promise<CuisineDetailDto> {
    const unlock = await this.prisma.cuisine_unlocks.findUnique({
      where: {
        userId_cuisineName: { userId, cuisineName: name },
      },
    });

    if (!unlock) {
      throw new NotFoundException('Cuisine not found');
    }

    const meals = await this.prisma.meal.findMany({
      where: {
        userId,
        cuisine: name,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const nutritionData = meals.map(m => ({
      calories: m.calories || 0,
      protein: m.protein || 0,
      fat: m.fat || 0,
      carbohydrates: m.carbohydrates || 0,
    }));

    const avgCalories = this.average(nutritionData.map(n => n.calories));
    const avgProtein = this.average(nutritionData.map(n => n.protein));
    const avgFat = this.average(nutritionData.map(n => n.fat));
    const avgCarbs = this.average(nutritionData.map(n => n.carbohydrates));

    return {
      name: unlock.cuisineName,
      icon: unlock.cuisineIcon || undefined,
      color: unlock.cuisineColor || undefined,
      mealCount: unlock.mealCount,
      firstMealAt: unlock.firstMealAt,
      lastMealAt: unlock.lastMealAt || undefined,
      nutritionSummary: {
        avgCalories,
        avgProtein,
        avgFat,
        avgCarbs,
      },
    };
  }

  /**
   * 获取菜系统计详情
   * 获取指定菜系的统计数据，包括唯一菜品数量
   */
  async getCuisineStats(userId: string, name: string): Promise<CuisineDetailStatsDto> {
    const unlock = await this.prisma.cuisine_unlocks.findUnique({
      where: {
        userId_cuisineName: { userId, cuisineName: name },
      },
    });

    if (!unlock) {
      throw new NotFoundException('Cuisine not found');
    }

    // 获取该用户在菜品知识库中属于该菜系的所有唯一菜品
    // 通过 dish_unlocks 表获取用户解锁的菜品，然后从 dishes 表筛选属于该菜系的菜品
    const dishUnlocks = await this.prisma.dish_unlocks.findMany({
      where: {
        userId,
      },
      select: {
        dishName: true,
      },
    });

    // 获取这些菜品在知识库中的菜系信息
    const dishNames = dishUnlocks.map(d => d.dishName);
    const dishesInKnowledgeBase = await this.prisma.dish.findMany({
      where: {
        name: {
          in: dishNames,
        },
        cuisine: name,
      },
      select: {
        name: true,
      },
    });

    const uniqueDishCount = dishesInKnowledgeBase.length;

    // 获取该菜系的所有餐食（从 meal.cuisine 字段判断）
    const meals = await this.prisma.meal.findMany({
      where: {
        userId,
        cuisine: name,
        deletedAt: null,
      },
      select: {
        calories: true,
      },
    });

    const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);

    return {
      cuisineName: name,
      totalMeals: meals.length,
      uniqueDishes: uniqueDishCount,
      totalCalories,
      averageCalories: meals.length > 0 ? totalCalories / meals.length : 0,
      firstMealAt: unlock.firstMealAt,
      lastMealAt: unlock.lastMealAt || unlock.firstMealAt,
    };
  }

  private mapToCuisineConfig(cuisine: cuisine_configs): CuisineConfigDto {
    return {
      name: cuisine.name,
      nameEn: cuisine.nameEn ?? undefined,
      nameZh: cuisine.nameZh ?? undefined,
      category: cuisine.category ?? undefined,
      icon: cuisine.icon,
      color: cuisine.color,
      description: cuisine.description ?? undefined,
      displayOrder: cuisine.displayOrder,
    };
  }

  private mapToCuisineUnlock(unlock: cuisine_unlocks): CuisineUnlockDto {
    return {
      cuisineName: unlock.cuisineName,
      icon: unlock.cuisineIcon ?? undefined,
      color: unlock.cuisineColor ?? undefined,
      firstMealAt: unlock.firstMealAt,
      mealCount: unlock.mealCount,
      lastMealAt: unlock.lastMealAt ?? undefined,
    };
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }
}

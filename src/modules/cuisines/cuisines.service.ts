import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CuisineConfigDto, CuisineUnlockDto, CuisineStatsDto, CuisineDetailDto } from './dto/cuisine-response.dto';

@Injectable()
export class CuisinesService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<CuisineConfigDto[]> {
    const cuisines = await this.prisma.cuisine_configs.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    return cuisines.map(c => this.mapToCuisineConfig(c));
  }

  async findUnlocked(userId: string): Promise<CuisineUnlockDto[]> {
    const unlocks = await this.prisma.cuisine_unlocks.findMany({
      where: { userId },
      orderBy: { mealCount: 'desc' },
    });

    return unlocks.map(u => this.mapToCuisineUnlock(u));
  }

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

  private mapToCuisineConfig(cuisine: any): CuisineConfigDto {
    return {
      name: cuisine.name,
      nameEn: cuisine.nameEn,
      nameZh: cuisine.nameZh,
      category: cuisine.category,
      icon: cuisine.icon,
      color: cuisine.color,
      description: cuisine.description,
      displayOrder: cuisine.displayOrder,
    };
  }

  private mapToCuisineUnlock(unlock: any): CuisineUnlockDto {
    return {
      cuisineName: unlock.cuisineName,
      icon: unlock.cuisineIcon,
      color: unlock.cuisineColor,
      firstMealAt: unlock.firstMealAt,
      mealCount: unlock.mealCount,
      lastMealAt: unlock.lastMealAt,
    };
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }
}

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { MealResponseDto, PaginatedMealsDto } from './dto/meal-response.dto';
import { MealQueryDto } from './dto/meal-query.dto';
import { PaginatedResponse } from '../../common/dto/pagination.dto';
import { DateTime } from 'luxon';
import { DishesService } from '../dishes/dishes.service';
// import { IngredientsService } from '../ingredients/ingredients.service'; // Temporarily disabled - tables don't exist

@Injectable()
export class MealsService {
  constructor(
    private prisma: PrismaService,
    private dishesService: DishesService,
    // private ingredientsService: IngredientsService,
  ) {}

  async create(userId: string, dto: CreateMealDto): Promise<MealResponseDto> {
    // AI 返回的是 dishes 数组，取第一个菜品
    const firstDish = dto.analysis.dishes?.[0];
    if (!firstDish) {
      throw new Error('Invalid AI response: no dishes found');
    }

    const foodName = firstDish.foodName;
    const cuisine = firstDish.cuisine;
    const calories = dto.analysis.nutrition.calories;
    const protein = dto.analysis.nutrition.protein;
    const fat = dto.analysis.nutrition.fat;
    const carbohydrates = dto.analysis.nutrition.carbohydrates;
    const price = dto.analysis.foodPrice;
    const description = dto.analysis.description;
    const historicalOrigins = dto.analysis.historicalOrigins;

    // 更新或创建菜品知识库
    const dish = await this.dishesService.findOrCreateAndUpdate(
      foodName,
      cuisine,
      price,
      calories,
      protein,
      fat,
      carbohydrates,
      description,
      historicalOrigins,
    );

    const meal = await this.prisma.meal.create({
      data: {
        userId,
        imageUrl: dto.imageUrl,
        thumbnailUrl: dto.thumbnailUrl,
        analysis: dto.analysis as any,
        foodName,
        cuisine,
        mealType: dto.mealType || 'SNACK',
        notes: dto.notes,
        calories,
        protein,
        fat,
        carbohydrates,
        price,
        dishId: dish.id,
        searchText: `${foodName} ${cuisine} ${dto.notes || ''}`.toLowerCase(),
        analyzedAt: new Date(),
      },
    });

    // 关联食材到餐食（暂时跳过，因为 ingredients 表不存在）
    // if (dto.analysis.ingredients && Array.isArray(dto.analysis.ingredients)) {
    //   await this.ingredientsService.linkIngredientsToMeal(meal.id, dto.analysis.ingredients);
    // }

    // 更新菜系解锁和每日营养（容错处理）
    try {
      await this.updateCuisineUnlock(userId, cuisine);
    } catch (error) {
      console.error(`Failed to update cuisine unlock: ${error.message}`);
    }

    try {
      await this.updateDailyNutrition(userId, meal);
    } catch (error) {
      console.error(`Failed to update daily nutrition: ${error.message}`);
    }

    try {
      await this.updateDishUnlock(userId, foodName);
    } catch (error) {
      console.error(`Failed to update dish unlock: ${error.message}`);
    }

    return this.mapToMealResponse(meal);
  }

  /**
   * 创建一个待分析的 meal 记录
   */
  async createPending(userId: string, dto: { imageUrl: string; thumbnailUrl?: string; mealType?: string }): Promise<MealResponseDto> {
    const meal = await this.prisma.meal.create({
      data: {
        userId,
        imageUrl: dto.imageUrl,
        thumbnailUrl: dto.thumbnailUrl,
        analysis: {
          status: 'analyzing',
          message: 'AI analysis is in progress...',
        } as any,
        foodName: '分析中...',
        cuisine: '待定',
        mealType: (dto.mealType as any) || 'SNACK',
        searchText: 'analyzing pending',
      },
    });

    return this.mapToMealResponse(meal);
  }

  /**
   * 用 AI 分析结果更新 meal 记录
   */
  async updateWithAnalysis(mealId: string, data: {
    analysis: any;
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
    price?: number;
    foodName: string;
    cuisine: string;
    description?: string;
    historicalOrigins?: string;
  }): Promise<MealResponseDto> {
    const meal = await this.prisma.meal.findUnique({
      where: { id: mealId },
    });

    if (!meal) {
      throw new NotFoundException('Meal not found');
    }

    // 更新或创建菜品知识库
    const dish = await this.dishesService.findOrCreateAndUpdate(
      data.foodName,
      data.cuisine,
      data.price,
      data.calories,
      data.protein,
      data.fat,
      data.carbohydrates,
      data.description,
      data.historicalOrigins,
    );

    // 更新 meal 记录
    const updatedMeal = await this.prisma.meal.update({
      where: { id: mealId },
      data: {
        analysis: data.analysis,
        foodName: data.foodName,
        cuisine: data.cuisine,
        calories: data.calories,
        protein: data.protein,
        fat: data.fat,
        carbohydrates: data.carbohydrates,
        price: data.price,
        dishId: dish.id,
        searchText: `${data.foodName} ${data.cuisine}`.toLowerCase(),
        analyzedAt: new Date(),
      },
    });

    // 关联食材到餐食（暂时跳过，因为 ingredients 表不存在）
    // if (data.analysis.ingredients && Array.isArray(data.analysis.ingredients)) {
    //   await this.ingredientsService.linkIngredientsToMeal(mealId, data.analysis.ingredients);
    // }

    // 更新菜系解锁和每日营养（容错处理）
    try {
      await this.updateCuisineUnlock(meal.userId, data.cuisine);
    } catch (error) {
      console.error(`Failed to update cuisine unlock: ${error.message}`);
    }

    try {
      await this.updateDailyNutrition(meal.userId, updatedMeal);
    } catch (error) {
      console.error(`Failed to update daily nutrition: ${error.message}`);
    }

    try {
      await this.updateDishUnlock(meal.userId, data.foodName);
    } catch (error) {
      console.error(`Failed to update dish unlock: ${error.message}`);
    }

    return this.mapToMealResponse(updatedMeal);
  }

  /**
   * 标记分析失败
   */
  async markAnalysisFailed(mealId: string, errorData: { error: string; status: string }): Promise<MealResponseDto> {
    const updatedMeal = await this.prisma.meal.update({
      where: { id: mealId },
      data: {
        analysis: {
          status: errorData.status,
          error: errorData.error,
          message: 'AI analysis failed. Please try again.',
        } as any,
        foodName: '分析失败',
        cuisine: '未知',
      },
    });

    return this.mapToMealResponse(updatedMeal);
  }

  async findAll(userId: string, query: MealQueryDto): Promise<PaginatedMealsDto> {
    const { page = 1, limit = 20, offset, mealType, startDate, endDate, cuisine, sortBy, sortOrder } = query;

    const skip = offset ?? (page - 1) * limit;

    const where: any = {
      userId,
      deletedAt: null,
    };

    if (mealType) {
      where.mealType = mealType;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (cuisine) {
      where.cuisine = cuisine;
    }

    const orderBy: any = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [meals, total] = await Promise.all([
      this.prisma.meal.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.meal.count({ where }),
    ]);

    return new PaginatedResponse(
      meals.map(m => this.mapToMealResponse(m)),
      total,
      page,
      limit,
    ) as PaginatedMealsDto;
  }

  async findOne(userId: string, id: string): Promise<MealResponseDto> {
    const meal = await this.prisma.meal.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!meal) {
      throw new NotFoundException('Meal not found');
    }

    return this.mapToMealResponse(meal);
  }

  async update(userId: string, id: string, dto: UpdateMealDto): Promise<MealResponseDto> {
    const meal = await this.prisma.meal.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!meal) {
      throw new NotFoundException('Meal not found');
    }

    const updatedMeal = await this.prisma.meal.update({
      where: { id },
      data: {
        ...dto,
        version: { increment: 1 },
      },
    });

    return this.mapToMealResponse(updatedMeal);
  }

  async remove(userId: string, id: string): Promise<void> {
    const meal = await this.prisma.meal.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!meal) {
      throw new NotFoundException('Meal not found');
    }

    await this.prisma.meal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getToday(userId: string): Promise<MealResponseDto[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const meals = await this.prisma.meal.findMany({
      where: {
        userId,
        createdAt: { gte: today, lt: tomorrow },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    return meals.map(m => this.mapToMealResponse(m));
  }

  async getByDate(userId: string, date: Date): Promise<MealResponseDto[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const meals = await this.prisma.meal.findMany({
      where: {
        userId,
        createdAt: { gte: startOfDay, lt: endOfDay },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    return meals.map(m => this.mapToMealResponse(m));
  }

  /**
   * Get all meals for a specific dish (by foodName)
   */
  async getByDishName(userId: string, foodName: string): Promise<{
    meals: MealResponseDto[];
    dish: {
      name: string;
      cuisine: string;
      appearanceCount: number;
      averageCalories: number | null;
      averageProtein: number | null;
      averageFat: number | null;
      averageCarbs: number | null;
      description: string | null;
      historicalOrigins: string | null;
    } | null;
  }> {
    // Get meals for this dish
    const meals = await this.prisma.meal.findMany({
      where: {
        userId,
        foodName,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get dish information from knowledge base
    const dish = await this.prisma.dish.findUnique({
      where: { name: foodName },
    });

    return {
      meals: meals.map(m => this.mapToMealResponse(m)),
      dish: dish ? {
        name: dish.name,
        cuisine: dish.cuisine,
        appearanceCount: dish.appearanceCount,
        averageCalories: dish.averageCalories,
        averageProtein: dish.averageProtein,
        averageFat: dish.averageFat,
        averageCarbs: dish.averageCarbs,
        description: dish.description,
        historicalOrigins: dish.historicalOrigins,
      } : null,
    };
  }

  private async updateCuisineUnlock(userId: string, cuisineName: string): Promise<void> {
    const existing = await this.prisma.cuisine_unlocks.findUnique({
      where: {
        userId_cuisineName: { userId, cuisineName },
      },
    });

    if (existing) {
      await this.prisma.cuisine_unlocks.update({
        where: { id: existing.id },
        data: {
          mealCount: { increment: 1 },
          lastMealAt: new Date(),
        },
      });
    } else {
      const config = await this.prisma.cuisine_configs.findUnique({
        where: { name: cuisineName },
      });

      await this.prisma.cuisine_unlocks.create({
        data: {
          userId,
          cuisineName,
          firstMealAt: new Date(),
          mealCount: 1,
          lastMealAt: new Date(),
          cuisineIcon: config?.icon,
          cuisineColor: config?.color,
        },
      });
    }
  }

  private async updateDailyNutrition(userId: string, meal: any): Promise<void> {
    const mealDate = new Date(meal.createdAt);
    mealDate.setHours(0, 0, 0, 0);

    const daily = await this.prisma.daily_nutritions.findUnique({
      where: {
        userId_date: { userId, date: mealDate },
      },
    });

    const nutrition = meal.analysis?.nutrition || {};

    if (daily) {
      await this.prisma.daily_nutritions.update({
        where: { id: daily.id },
        data: {
          totalCalories: { increment: nutrition.calories || 0 },
          totalProtein: { increment: nutrition.protein || 0 },
          totalFat: { increment: nutrition.fat || 0 },
          totalCarbohydrates: { increment: nutrition.carbohydrates || 0 },
          totalFiber: { increment: nutrition.fiber || 0 },
          totalSugar: { increment: nutrition.sugar || 0 },
          totalSodium: { increment: nutrition.sodium || 0 },
          mealCount: { increment: 1 },
          breakfastCount: meal.mealType === 'BREAKFAST' ? { increment: 1 } : undefined,
          lunchCount: meal.mealType === 'LUNCH' ? { increment: 1 } : undefined,
          dinnerCount: meal.mealType === 'DINNER' ? { increment: 1 } : undefined,
          snackCount: meal.mealType === 'SNACK' ? { increment: 1 } : undefined,
        },
      });
    } else {
      await this.prisma.daily_nutritions.create({
        data: {
          userId,
          date: mealDate,
          totalCalories: nutrition.calories || 0,
          totalProtein: nutrition.protein || 0,
          totalFat: nutrition.fat || 0,
          totalCarbohydrates: nutrition.carbohydrates || 0,
          totalFiber: nutrition.fiber || 0,
          totalSugar: nutrition.sugar || 0,
          totalSodium: nutrition.sodium || 0,
          mealCount: 1,
          breakfastCount: meal.mealType === 'BREAKFAST' ? 1 : 0,
          lunchCount: meal.mealType === 'LUNCH' ? 1 : 0,
          dinnerCount: meal.mealType === 'DINNER' ? 1 : 0,
          snackCount: meal.mealType === 'SNACK' ? 1 : 0,
        },
      });
    }
  }

  private async updateDishUnlock(userId: string, dishName: string): Promise<void> {
    const existing = await this.prisma.dish_unlocks.findUnique({
      where: {
        userId_dishName: { userId, dishName },
      },
    });

    if (existing) {
      await this.prisma.dish_unlocks.update({
        where: { id: existing.id },
        data: {
          mealCount: { increment: 1 },
          lastMealAt: new Date(),
        },
      });
    } else {
      await this.prisma.dish_unlocks.create({
        data: {
          userId,
          dishName,
          firstMealAt: new Date(),
          mealCount: 1,
          lastMealAt: new Date(),
        },
      });
    }
  }

  private mapToMealResponse(meal: any): MealResponseDto {
    return {
      id: meal.id,
      userId: meal.userId,
      imageUrl: meal.imageUrl,
      thumbnailUrl: meal.thumbnailUrl,
      analysis: meal.analysis,
      mealType: meal.mealType,
      notes: meal.notes,
      createdAt: meal.createdAt,
      updatedAt: meal.updatedAt,
      isSynced: meal.isSynced,
      version: meal.version,
    };
  }
}

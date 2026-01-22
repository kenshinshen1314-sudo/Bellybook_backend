/**
 * [INPUT]: 依赖 PrismaService 的数据库访问、DishesService 的菜品知识库操作、DateUtil 的日期处理
 * [OUTPUT]: 对外提供餐食 CRUD、今日餐食、按日期查询、按菜品查询
 * [POS]: meals 模块的核心服务层，被 storage、sync 模块消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Meal, Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { MealResponseDto, PaginatedMealsDto } from './dto/meal-response.dto';
import { MealQueryDto } from './dto/meal-query.dto';
import { PaginatedResponse } from '../../common/dto/pagination.dto';
import { DishesService } from '../dishes/dishes.service';
import { DateUtil } from '../../common/utils/date.util';
import {
  AiAnalysis,
  AiDishInfo,
  CreateMealInput,
  MealFilters,
} from './meals.types';

@Injectable()
export class MealsService {
  private readonly logger = new Logger(MealsService.name);

  constructor(
    private prisma: PrismaService,
    private dishesService: DishesService,
  ) {}

  // ============================================================
  // 公共方法 - 餐食 CRUD
  // ============================================================

  /**
   * 创建餐食记录（带事务）
   *
   * 流程：
   * 1. 从 AI 分析结果中提取第一个菜品信息
   * 2. 更新菜品知识库（加权平均统计）
   * 3. 创建餐食记录
   * 4. 更新菜系解锁、每日营养、菜品解锁
   *
   * 所有步骤在单个事务中完成，确保数据一致性
   */
  async create(userId: string, dto: CreateMealDto): Promise<MealResponseDto> {
    const firstDish = this.extractFirstDish(dto.analysis);

    // 使用事务确保数据一致性
    const result = await this.prisma.runTransaction(
      async (tx) => {
        // 1. 更新菜品知识库
        const dish = await this.dishesService.findOrCreateAndUpdateInTx(
          tx,
          {
            foodName: firstDish.foodName,
            cuisine: firstDish.cuisine,
            nutrition: {
              calories: dto.analysis.nutrition.calories,
              protein: dto.analysis.nutrition.protein,
              fat: dto.analysis.nutrition.fat,
              carbohydrates: dto.analysis.nutrition.carbohydrates,
            },
            price: dto.analysis.foodPrice,
            description: dto.analysis.description,
            historicalOrigins: dto.analysis.historicalOrigins,
          },
        );

        // 2. 创建餐食记录
        const meal = await tx.meal.create({
          data: {
            userId,
            imageUrl: dto.imageUrl,
            thumbnailUrl: dto.thumbnailUrl,
            analysis: this.toPrismaJson(dto.analysis),
            foodName: firstDish.foodName,
            cuisine: firstDish.cuisine,
            mealType: dto.mealType || 'SNACK',
            notes: dto.notes,
            calories: dto.analysis.nutrition.calories,
            protein: dto.analysis.nutrition.protein,
            fat: dto.analysis.nutrition.fat,
            carbohydrates: dto.analysis.nutrition.carbohydrates,
            price: dto.analysis.foodPrice,
            dishId: dish.id,
            searchText: this.buildSearchText(
              firstDish.foodName,
              firstDish.cuisine,
              dto.notes,
            ),
            analyzedAt: new Date(),
          },
        });

        // 3. 更新统计数据（同一事务）
        await Promise.all([
          this.updateCuisineUnlockInTx(tx, userId, firstDish.cuisine),
          this.updateDailyNutritionInTx(tx, userId, meal),
          this.updateDishUnlockInTx(tx, userId, firstDish.foodName),
        ]);

        return { meal, dish };
      },
      {
        maxWait: 5000,
        timeout: 10000,
      },
    );

    this.logger.log(`Meal created: ${result.meal.id} for user: ${userId}`);

    return this.mapToMealResponse(result.meal);
  }

  /**
   * 创建待分析的餐食记录（占位符）
   */
  async createPending(
    userId: string,
    dto: CreateMealDto,
  ): Promise<MealResponseDto> {
    const meal = await this.prisma.meal.create({
      data: {
        userId,
        imageUrl: dto.imageUrl,
        thumbnailUrl: dto.thumbnailUrl,
        analysis: this.toPrismaJson({
          status: 'analyzing',
          message: 'AI analysis is in progress...',
        }),
        foodName: '分析中...',
        cuisine: '待定',
        mealType: dto.mealType || 'SNACK',
        searchText: 'analyzing pending',
      },
    });

    return this.mapToMealResponse(meal);
  }

  /**
   * 用 AI 分析结果更新餐食记录
   */
  async updateWithAnalysis(
    mealId: string,
    data: {
      analysis: AiAnalysis;
      calories: number;
      protein: number;
      fat: number;
      carbohydrates: number;
      price?: number;
      foodName: string;
      cuisine: string;
      description?: string;
      historicalOrigins?: string;
    },
  ): Promise<MealResponseDto> {
    // 使用事务确保数据一致性
    const result = await this.prisma.runTransaction(async (tx) => {
      // 1. 检查餐食是否存在
      const meal = await tx.meal.findUnique({
        where: { id: mealId },
      });

      if (!meal) {
        throw new NotFoundException('Meal not found');
      }

      // 2. 更新菜品知识库
      const dish = await this.dishesService.findOrCreateAndUpdateInTx(tx, {
        foodName: data.foodName,
        cuisine: data.cuisine,
        nutrition: {
          calories: data.calories,
          protein: data.protein,
          fat: data.fat,
          carbohydrates: data.carbohydrates,
        },
        price: data.price,
        description: data.description,
        historicalOrigins: data.historicalOrigins,
      });

      // 3. 更新餐食记录
      const updatedMeal = await tx.meal.update({
        where: { id: mealId },
        data: {
          analysis: this.toPrismaJson(data.analysis),
          foodName: data.foodName,
          cuisine: data.cuisine,
          calories: data.calories,
          protein: data.protein,
          fat: data.fat,
          carbohydrates: data.carbohydrates,
          price: data.price,
          dishId: dish.id,
          searchText: this.buildSearchText(data.foodName, data.cuisine),
          analyzedAt: new Date(),
        },
      });

      // 4. 更新统计数据
      await Promise.all([
        this.updateCuisineUnlockInTx(tx, meal.userId, data.cuisine),
        this.updateDailyNutritionInTx(tx, meal.userId, updatedMeal),
        this.updateDishUnlockInTx(tx, meal.userId, data.foodName),
      ]);

      return updatedMeal;
    });

    this.logger.log(`Meal updated with analysis: ${mealId}`);

    return this.mapToMealResponse(result);
  }

  /**
   * 标记分析失败
   */
  async markAnalysisFailed(
    mealId: string,
    errorData: { error: string; status: string },
  ): Promise<MealResponseDto> {
    const updatedMeal = await this.prisma.meal.update({
      where: { id: mealId },
      data: {
        analysis: this.toPrismaJson({
          status: errorData.status,
          error: errorData.error,
          message: 'AI analysis failed. Please try again.',
        }),
        foodName: '分析失败',
        cuisine: '未知',
      },
    });

    return this.mapToMealResponse(updatedMeal);
  }

  /**
   * 查询用户的餐食列表（分页）
   */
  async findAll(
    userId: string,
    query: MealQueryDto,
  ): Promise<PaginatedMealsDto> {
    const { page = 1, limit = 20, offset, mealType, startDate, endDate, cuisine, sortBy, sortOrder } = query;
    const skip = offset ?? (page - 1) * limit;

    const where = this.buildWhereClause(userId, { mealType, startDate, endDate, cuisine });
    const orderBy = this.buildOrderByClause(sortBy, sortOrder);

    const [meals, total] = await Promise.all([
      this.prisma.meal.findMany({ where, orderBy, skip, take: limit }),
      this.prisma.meal.count({ where }),
    ]);

    return new PaginatedResponse(
      meals.map((m) => this.mapToMealResponse(m)),
      total,
      page,
      limit,
    ) as PaginatedMealsDto;
  }

  /**
   * 查询单个餐食
   */
  async findOne(userId: string, id: string): Promise<MealResponseDto> {
    const meal = await this.prisma.meal.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!meal) {
      throw new NotFoundException('Meal not found');
    }

    return this.mapToMealResponse(meal);
  }

  /**
   * 更新餐食
   */
  async update(
    userId: string,
    id: string,
    dto: UpdateMealDto,
  ): Promise<MealResponseDto> {
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

  /**
   * 删除餐食（软删除）
   */
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

    this.logger.log(`Meal deleted: ${id} by user: ${userId}`);
  }

  // ============================================================
  // 公共方法 - 按日期/菜品查询
  // ============================================================

  /**
   * 获取今日餐食
   */
  async getToday(userId: string): Promise<MealResponseDto[]> {
    const [today, tomorrow] = DateUtil.dayRange();

    const meals = await this.prisma.meal.findMany({
      where: {
        userId,
        createdAt: { gte: today, lt: tomorrow },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    return meals.map((m) => this.mapToMealResponse(m));
  }

  /**
   * 获取指定日期的餐食
   */
  async getByDate(userId: string, date: Date): Promise<MealResponseDto[]> {
    const [startOfDay, endOfDay] = DateUtil.dayRange(date);

    const meals = await this.prisma.meal.findMany({
      where: {
        userId,
        createdAt: { gte: startOfDay, lt: endOfDay },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    return meals.map((m) => this.mapToMealResponse(m));
  }

  /**
   * 获取指定菜品的所有餐食
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
    const [meals, dish] = await Promise.all([
      this.prisma.meal.findMany({
        where: { userId, foodName, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.dish.findUnique({ where: { name: foodName } }),
    ]);

    return {
      meals: meals.map((m) => this.mapToMealResponse(m)),
      dish: dish
        ? {
            name: dish.name,
            cuisine: dish.cuisine,
            appearanceCount: dish.appearanceCount,
            averageCalories: dish.averageCalories,
            averageProtein: dish.averageProtein,
            averageFat: dish.averageFat,
            averageCarbs: dish.averageCarbs,
            description: dish.description,
            historicalOrigins: dish.historicalOrigins,
          }
        : null,
    };
  }

  // ============================================================
  // 私有方法 - 统计更新（事务内）
  // ============================================================

  /**
   * 更新菜系解锁记录（事务内）
   */
  private async updateCuisineUnlockInTx(
    tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    userId: string,
    cuisineName: string,
  ): Promise<void> {
    const existing = await tx.cuisine_unlocks.findUnique({
      where: { userId_cuisineName: { userId, cuisineName } },
    });

    if (existing) {
      await tx.cuisine_unlocks.update({
        where: { id: existing.id },
        data: { mealCount: { increment: 1 }, lastMealAt: new Date() },
      });
    } else {
      const config = await tx.cuisine_configs.findUnique({
        where: { name: cuisineName },
      });

      await tx.cuisine_unlocks.create({
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

  /**
   * 更新每日营养统计（事务内）
   */
  private async updateDailyNutritionInTx(
    tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    userId: string,
    meal: Meal,
  ): Promise<void> {
    const mealDate = DateUtil.startOfDay(meal.createdAt);

    // 从 JSON 提取营养数据
    const analysis = meal.analysis as unknown as AiAnalysis;
    const nutrition = analysis?.nutrition || {
      calories: meal.calories || 0,
      protein: meal.protein || 0,
      fat: meal.fat || 0,
      carbohydrates: meal.carbohydrates || 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    };

    const existing = await tx.daily_nutritions.findUnique({
      where: { userId_date: { userId, date: mealDate } },
    });

    const incrementData = {
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
    };

    if (existing) {
      await tx.daily_nutritions.update({
        where: { id: existing.id },
        data: incrementData,
      });
    } else {
      await tx.daily_nutritions.create({
        data: {
          userId,
          date: mealDate,
          ...incrementData,
        },
      });
    }
  }

  /**
   * 更新菜品解锁记录（事务内）
   */
  private async updateDishUnlockInTx(
    tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    userId: string,
    dishName: string,
  ): Promise<void> {
    const existing = await tx.dish_unlocks.findUnique({
      where: { userId_dishName: { userId, dishName } },
    });

    if (existing) {
      await tx.dish_unlocks.update({
        where: { id: existing.id },
        data: { mealCount: { increment: 1 }, lastMealAt: new Date() },
      });
    } else {
      await tx.dish_unlocks.create({
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

  // ============================================================
  // 私有方法 - 辅助函数
  // ============================================================

  /**
   * 从 AI 分析结果中提取第一个菜品信息
   */
  private extractFirstDish(analysis: AiAnalysis): AiDishInfo {
    const firstDish = analysis.dishes?.[0];
    if (!firstDish) {
      throw new Error('Invalid AI response: no dishes found');
    }
    return firstDish;
  }

  /**
   * 将对象转换为 Prisma.InputJsonValue
   */
  private toPrismaJson<T>(value: T): Prisma.InputJsonValue {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      this.logger.error('Failed to convert to Prisma.InputJsonValue', error);
      return {};
    }
  }

  /**
   * 构建搜索文本
   */
  private buildSearchText(
    foodName: string,
    cuisine: string,
    notes?: string,
  ): string {
    return `${foodName} ${cuisine} ${notes || ''}`.toLowerCase().trim();
  }

  /**
   * 构建查询条件
   */
  private buildWhereClause(
    userId: string,
    filters: MealFilters,
  ): Prisma.MealWhereInput {
    const where: Prisma.MealWhereInput = {
      userId,
      deletedAt: null,
    };

    if (filters.mealType) {
      where.mealType =
        filters.mealType as 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    if (filters.cuisine) {
      where.cuisine = filters.cuisine;
    }

    return where;
  }

  /**
   * 构建排序条件
   */
  private buildOrderByClause(
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Prisma.MealOrderByWithRelationInput {
    if (sortBy) {
      return { [sortBy]: sortOrder || 'desc' };
    }
    return { createdAt: 'desc' };
  }

  /**
   * 映射到响应 DTO
   */
  private mapToMealResponse(meal: Meal): MealResponseDto {
    return {
      id: meal.id,
      userId: meal.userId,
      imageUrl: meal.imageUrl,
      thumbnailUrl: meal.thumbnailUrl ?? undefined,
      analysis: meal.analysis as any, // Prisma Json 类型
      mealType: meal.mealType,
      notes: meal.notes ?? undefined,
      createdAt: meal.createdAt,
      updatedAt: meal.updatedAt,
      isSynced: meal.isSynced,
      version: meal.version,
    };
  }
}

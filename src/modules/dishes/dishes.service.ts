/**
 * [INPUT]: 依赖 PrismaService 的数据库访问能力、CacheService 的缓存能力
 * [OUTPUT]: 对外提供菜品知识库的 CRUD 操作、统计更新
 * [POS]: dishes 模块的核心服务层，被 meals 模块消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [PERFORMANCE OPTIMIZED]
 * - 添加 Redis 缓存层，TTL: 1小时（菜品数据变化频率低）
 * - 使用 @Cacheable 装饰器自动管理缓存
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CacheStatsService } from '../cache/cache-stats.service';
import { Cacheable } from '../cache/cache.decorator';
import { CachePrefix, CacheTTL } from '../cache/cache.constants';
import { DishInput } from '../ai/ai-types';

/**
 * 菜品输入数据（完整版）
 */
interface DishInputComplete extends DishInput {
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
  };
}

@Injectable()
export class DishesService {
  private readonly logger = new Logger(DishesService.name);

  constructor(
    private prisma: PrismaService,
    public cacheService: CacheService,
    public cacheStatsService: CacheStatsService,
  ) {}

  // ============================================================
  // 公共方法 - 非事务版本
  // ============================================================

  /**
   * 查找或创建菜品记录，并更新统计数据
   *
   * 如果菜品已存在，使用加权平均更新营养数据
   * 如果菜品不存在，创建新菜品记录
   */
  async findOrCreateAndUpdate(input: DishInputComplete) {
    return this.prisma.runTransaction(async (tx) => {
      return this.findOrCreateAndUpdateInTx(tx, input);
    });
  }

  /**
   * 获取热门菜品（带缓存）
   *
   * @param limit 返回数量限制
   * @param cuisine 菜系筛选（可选）
   */
  @Cacheable(CachePrefix.DISH_INFO, ['limit', 'cuisine'], CacheTTL.LONG)
  async getPopularDishes(limit: number = 10, cuisine?: string) {
    return this.prisma.dish.findMany({
      where: cuisine ? { cuisine } : undefined,
      orderBy: { appearanceCount: 'desc' },
      take: limit,
    });
  }

  /**
   * 获取菜品详情（带缓存）
   *
   * @param name 菜品名称（唯一键）
   */
  @Cacheable(CachePrefix.DISH_INFO, ['name'], CacheTTL.LONG)
  async getDishByName(name: string) {
    return this.prisma.dish.findUnique({
      where: { name },
    });
  }

  // ============================================================
  // 公共方法 - 事务版本
  // ============================================================

  /**
   * 查找或创建菜品记录（事务版本）
   *
   * 此方法设计为在事务内部调用
   * 接收事务实例作为参数，而不是直接使用 prisma
   *
   * @param tx Prisma 事务实例
   * @param input 菜品输入数据
   * @returns 菜品记录
   */
  async findOrCreateAndUpdateInTx(
    tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    input: DishInputComplete,
  ) {
    const { foodName, cuisine, price, nutrition, description, historicalOrigins } = input;

    // 查找已存在的菜品
    let dish = await tx.dish.findUnique({
      where: { name: foodName },
    });

    if (dish) {
      // 更新统计（使用加权平均）
      const newCount = dish.appearanceCount + 1;
      const oldWeight = dish.appearanceCount;
      const newWeight = 1;

      dish = await tx.dish.update({
        where: { id: dish.id },
        data: {
          appearanceCount: newCount,
          averagePrice: this.updateWeightedAverage(
            dish.averagePrice,
            price,
            oldWeight,
            newWeight,
          ),
          averageCalories: this.updateWeightedAverage(
            dish.averageCalories,
            nutrition.calories,
            oldWeight,
            newWeight,
          ),
          averageProtein: this.updateWeightedAverage(
            dish.averageProtein,
            nutrition.protein,
            oldWeight,
            newWeight,
          ),
          averageFat: this.updateWeightedAverage(
            dish.averageFat,
            nutrition.fat,
            oldWeight,
            newWeight,
          ),
          averageCarbs: this.updateWeightedAverage(
            dish.averageCarbs,
            nutrition.carbohydrates,
            oldWeight,
            newWeight,
          ),
          description: description || dish.description,
          historicalOrigins: historicalOrigins || dish.historicalOrigins,
        },
      });

      this.logger.debug(`Updated dish statistics: ${foodName} (count: ${newCount})`);
    } else {
      // 创建新菜品
      dish = await tx.dish.create({
        data: {
          name: foodName,
          cuisine,
          description,
          historicalOrigins,
          appearanceCount: 1,
          averagePrice: price,
          averageCalories: nutrition.calories,
          averageProtein: nutrition.protein,
          averageFat: nutrition.fat,
          averageCarbs: nutrition.carbohydrates,
        },
      });

      this.logger.debug(`Created new dish: ${foodName} (${cuisine})`);
    }

    return dish;
  }

  // ============================================================
  // 私有方法 - 工具函数
  // ============================================================

  /**
   * 计算加权平均
   *
   * @param oldAverage 旧的平均值
   * @param newValue 新值
   * @param oldWeight 旧权重（出现次数）
   * @param newWeight 新权重
   * @returns 加权平均值，如果新值无效则返回旧值
   *
   * @example
   * updateWeightedAverage(100, 150, 5, 1)
   * // (100 * 5 + 150 * 1) / (5 + 1) = 650 / 6 ≈ 108.33
   */
  private updateWeightedAverage(
    oldAverage: number | null,
    newValue: number | undefined,
    oldWeight: number,
    newWeight: number,
  ): number | null {
    // 新值无效，返回旧值
    if (newValue === undefined || newValue === null) {
      return oldAverage;
    }

    // 旧值无效，返回新值
    if (oldAverage === null || oldAverage === undefined) {
      return newValue;
    }

    // 计算加权平均
    return (oldAverage * oldWeight + newValue * newWeight) / (oldWeight + newWeight);
  }
}

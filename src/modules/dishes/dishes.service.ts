/**
 * [INPUT]: 依赖 PrismaService 的数据库访问能力
 * [OUTPUT]: 对外提供菜品知识库的 CRUD 操作、统计更新
 * [POS]: dishes 模块的核心服务层，被 meals 模块消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DishInput } from '../ai/ai-types';

@Injectable()
export class DishesService {
  private readonly logger = new Logger(DishesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 查找或创建菜品记录，并更新统计数据
   *
   * 如果菜品已存在，使用加权平均更新营养数据
   * 如果菜品不存在，创建新菜品记录
   */
  async findOrCreateAndUpdate(input: DishInput) {
    const { foodName, cuisine, price, nutrition, description, historicalOrigins } = input;

    // 查找已存在的菜品
    let dish = await this.prisma.dish.findUnique({
      where: { name: foodName },
    });

    if (dish) {
      // 更新统计（使用加权平均）
      const newCount = dish.appearanceCount + 1;
      const oldWeight = dish.appearanceCount;
      const newWeight = 1;

      dish = await this.prisma.dish.update({
        where: { id: dish.id },
        data: {
          appearanceCount: newCount,
          averagePrice: this.updateWeightedAverage(dish.averagePrice, price, oldWeight, newWeight),
          averageCalories: this.updateWeightedAverage(dish.averageCalories, nutrition.calories, oldWeight, newWeight),
          averageProtein: this.updateWeightedAverage(dish.averageProtein, nutrition.protein, oldWeight, newWeight),
          averageFat: this.updateWeightedAverage(dish.averageFat, nutrition.fat, oldWeight, newWeight),
          averageCarbs: this.updateWeightedAverage(dish.averageCarbs, nutrition.carbohydrates, oldWeight, newWeight),
          description: description || dish.description,
          historicalOrigins: historicalOrigins || dish.historicalOrigins,
        },
      });

      this.logger.log(`Updated dish statistics: ${foodName} (count: ${newCount})`);
    } else {
      // 创建新菜品
      dish = await this.prisma.dish.create({
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

      this.logger.log(`Created new dish: ${foodName} (${cuisine})`);
    }

    return dish;
  }

  /**
   * 计算加权平均
   *
   * @param oldAverage 旧的平均值
   * @param newValue 新值
   * @param oldWeight 旧权重（出现次数）
   * @param newWeight 新权重
   * @returns 加权平均值，如果新值无效则返回旧值
   */
  private updateWeightedAverage(
    oldAverage: number | null,
    newValue: number | undefined,
    oldWeight: number,
    newWeight: number,
  ): number | null {
    if (newValue === undefined || newValue === null) {
      return oldAverage;
    }

    if (oldAverage === null || oldAverage === undefined) {
      return newValue;
    }

    return (oldAverage * oldWeight + newValue * newWeight) / (oldWeight + newWeight);
  }

  /**
   * 获取热门菜品
   *
   * @param limit 返回数量限制
   * @param cuisine 菜系筛选（可选）
   */
  async getPopularDishes(limit: number = 10, cuisine?: string) {
    return this.prisma.dish.findMany({
      where: cuisine ? { cuisine } : undefined,
      orderBy: { appearanceCount: 'desc' },
      take: limit,
    });
  }

  /**
   * 获取菜品详情
   *
   * @param name 菜品名称（唯一键）
   */
  async getDishByName(name: string) {
    return this.prisma.dish.findUnique({
      where: { name },
    });
  }
}

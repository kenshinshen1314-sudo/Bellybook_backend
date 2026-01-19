import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DishesService {
  private readonly logger = new Logger(DishesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 查找或创建菜品记录，并更新统计数据
   */
  async findOrCreateAndUpdate(
    foodName: string,
    cuisine: string,
    price?: number,
    calories?: number,
    protein?: number,
    fat?: number,
    carbohydrates?: number,
    description?: string,
    historicalOrigins?: string,
  ) {
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
          averageCalories: this.updateWeightedAverage(dish.averageCalories, calories, oldWeight, newWeight),
          averageProtein: this.updateWeightedAverage(dish.averageProtein, protein, oldWeight, newWeight),
          averageFat: this.updateWeightedAverage(dish.averageFat, fat, oldWeight, newWeight),
          averageCarbs: this.updateWeightedAverage(dish.averageCarbs, carbohydrates, oldWeight, newWeight),
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
          averageCalories: calories,
          averageProtein: protein,
          averageFat: fat,
          averageCarbs: carbohydrates,
        },
      });

      this.logger.log(`Created new dish: ${foodName} (${cuisine})`);
    }

    return dish;
  }

  /**
   * 计算加权平均
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
   */
  async getDishByName(name: string) {
    return this.prisma.dish.findUnique({
      where: { name },
    });
  }
}

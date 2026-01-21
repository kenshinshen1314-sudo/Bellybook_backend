/**
 * [INPUT]: 依赖 PrismaService 的数据库访问能力
 * [OUTPUT]: 对外提供菜品专家榜查询逻辑
 * [POS]: ranking 模块的菜品专家榜查询服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { RankingPeriod } from '@prisma/client';
import { DishExpertsDto, DishExpertEntry } from '../dto/ranking-response.dto';

@Injectable()
export class DishExpertsQuery {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取菜品专家榜
   * 统计每个用户的去重后菜品数量，倒序展示
   * 直接从 dish_unlocks 表获取统计数据
   */
  async execute(period: RankingPeriod): Promise<DishExpertsDto> {
    const { startDate } = this.getDateRange(period);

    // 直接从 dish_unlocks 表获取统计数据
    const unlocks = await this.prisma.dish_unlocks.findMany({
      where: startDate ? { firstMealAt: { gte: startDate } } : {},
      select: {
        userId: true,
        dishName: true,
        mealCount: true,
      },
    });

    // 按 userId 分组统计
    const userStats = new Map<string, {
      count: number;
      totalMeals: number;
      dishes: string[];
    }>();

    for (const unlock of unlocks) {
      const existing = userStats.get(unlock.userId);
      if (!existing) {
        userStats.set(unlock.userId, {
          count: 1,
          totalMeals: unlock.mealCount,
          dishes: [unlock.dishName],
        });
      } else {
        existing.count++;
        existing.totalMeals += unlock.mealCount;
        existing.dishes.push(unlock.dishName);
      }
    }

    const userMap = await this.getUserMap();

    const experts: DishExpertEntry[] = [];

    for (const [userId, stats] of userStats.entries()) {
      const user = userMap.get(userId);
      if (!user) continue;

      experts.push({
        rank: 0,
        userId,
        username: user.username,
        avatarUrl: user.avatarUrl,
        dishCount: stats.count,
        mealCount: stats.totalMeals,
        dishes: stats.dishes.slice(0, 10),
        cuisines: [], // 可选：查询菜系
      });
    }

    experts.sort((a, b) => b.dishCount - a.dishCount);
    experts.forEach((e, index) => { e.rank = index + 1; });

    return {
      period,
      experts: experts.slice(0, 100),
    };
  }

  /**
   * 获取用户映射（愿意参与排行榜的用户）
   */
  private async getUserMap(): Promise<Map<string, { username: string; avatarUrl: string | null }>> {
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

  /**
   * 根据时段获取开始日期
   */
  private getDateRange(period: RankingPeriod): { startDate?: Date } {
    const now = new Date();
    let startDate: Date | undefined;

    switch (period) {
      case RankingPeriod.WEEKLY:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case RankingPeriod.MONTHLY:
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case RankingPeriod.YEARLY:
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case RankingPeriod.ALL_TIME:
      default:
        startDate = undefined;
        break;
    }

    return { startDate };
  }
}

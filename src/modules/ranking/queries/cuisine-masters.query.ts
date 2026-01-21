/**
 * [INPUT]: 依赖 PrismaService 的数据库访问能力
 * [OUTPUT]: 对外提供菜系专家榜查询逻辑
 * [POS]: ranking 模块的菜系专家榜查询服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { RankingPeriod } from '@prisma/client';
import { CuisineMastersDto, CuisineMasterEntry } from '../dto/ranking-response.dto';

@Injectable()
export class CuisineMastersQuery {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取菜系专家榜
   * 使用 groupBy 进行数据库级聚合
   */
  async execute(
    cuisineName: string | undefined,
    period: RankingPeriod,
  ): Promise<CuisineMastersDto> {
    const { startDate } = this.getDateRange(period);

    // 使用 groupBy 进行数据库级聚合
    const [mealAggregates, userMap] = await Promise.all([
      this.prisma.meal.groupBy({
        by: ['userId', 'cuisine'],
        where: this.buildMealWhere(startDate, cuisineName),
        _count: { id: true },
        _min: { createdAt: true },
      }),
      this.getUserMap(),
    ]);

    // 构建排行榜数据
    const rankings: Array<{
      userId: string;
      cuisineName: string;
      mealCount: number;
      firstMealAt: Date;
    }> = [];

    for (const aggregate of mealAggregates) {
      const user = userMap.get(aggregate.userId);
      if (!user) continue;

      // 如果指定了菜系，只统计该菜系
      if (cuisineName) {
        if (aggregate.cuisine === cuisineName) {
          rankings.push({
            userId: aggregate.userId,
            cuisineName: aggregate.cuisine,
            mealCount: aggregate._count.id,
            firstMealAt: aggregate._min.createdAt!,
          });
        }
      } else {
        // 没有指定菜系，显示"全部菜系"（统计该用户所有餐食）
        rankings.push({
          userId: aggregate.userId,
          cuisineName: '全部菜系',
          mealCount: aggregate._count.id,
          firstMealAt: aggregate._min.createdAt!,
        });
      }
    }

    // 按 mealCount 降序排序，然后按 firstMealAt 升序排序
    rankings.sort((a, b) => {
      if (b.mealCount !== a.mealCount) {
        return b.mealCount - a.mealCount;
      }
      return a.firstMealAt.getTime() - b.firstMealAt.getTime();
    });

    // 取前 100 名并格式化
    const masters: CuisineMasterEntry[] = rankings.slice(0, 100).map((r, index) => {
      const user = userMap.get(r.userId)!;
      return {
        rank: index + 1,
        userId: r.userId,
        username: user.username,
        avatarUrl: user.avatarUrl,
        cuisineName: r.cuisineName,
        mealCount: r.mealCount,
        firstMealAt: r.firstMealAt.toISOString(),
      };
    });

    return {
      cuisineName,
      period,
      masters,
    };
  }

  /**
   * 构建查询条件
   */
  private buildMealWhere(startDate: Date | undefined, cuisineName: string | undefined) {
    const where: any = {
      deletedAt: null,
      users: {
        OR: [
          { user_settings: { is: null } },
          { user_settings: { hideRanking: false } },
        ],
      },
    };

    if (startDate) {
      where.createdAt = { gte: startDate };
    }

    if (cuisineName) {
      where.cuisine = cuisineName;
    }

    return where;
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

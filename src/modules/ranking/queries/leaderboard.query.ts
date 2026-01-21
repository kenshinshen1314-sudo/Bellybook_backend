/**
 * [INPUT]: 依赖 PrismaService 的数据库访问能力
 * [OUTPUT]: 对外提供综合排行榜查询逻辑
 * [POS]: ranking 模块的综合排行榜查询服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, RankingPeriod } from '@prisma/client';
import { LeaderboardDto, LeaderboardEntry } from '../dto/ranking-response.dto';

@Injectable()
export class LeaderboardQuery {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取综合排行榜
   * 使用 groupBy 和原始 SQL 进行数据库级聚合
   */
  async execute(
    period: RankingPeriod,
    tier: string | undefined,
  ): Promise<LeaderboardDto> {
    const { startDate } = this.getDateRange(period);

    // 获取用户餐食计数
    const mealCounts = await this.prisma.meal.groupBy({
      by: ['userId'],
      where: this.buildMealWhere(startDate),
      _count: { id: true },
      _sum: { calories: true },
    });

    // 使用原始 SQL 获取去重菜系数
    const uniqueCuisineCounts = await this.prisma.$queryRaw<Array<{ userId: string; count: bigint }>>`
      SELECT "userId", COUNT(DISTINCT "cuisine") as count
      FROM "meals"
      WHERE "deletedAt" IS NULL
        ${startDate ? Prisma.sql`AND "createdAt" >= ${startDate}` : Prisma.empty}
      GROUP BY "userId"
    `;

    const userMap = await this.getUserMap(tier);

    // 构建统计数据映射
    const mealCountMap = new Map(mealCounts.map(m => [m.userId, m._count.id]));
    const cuisineCountMap = new Map(uniqueCuisineCounts.map(m => [m.userId, Number(m.count)]));

    // 构建排行榜数据
    const rankings: LeaderboardEntry[] = [];

    for (const [userId, mealCount] of mealCountMap) {
      const user = userMap.get(userId);
      if (!user) continue;

      const cuisineCount = cuisineCountMap.get(userId) || 0;
      const score = mealCount * 10 + cuisineCount * 50;

      rankings.push({
        rank: 0,
        userId,
        username: user.username,
        avatarUrl: user.avatarUrl,
        score,
        mealCount,
        cuisineCount,
      });
    }

    // 按 score 降序排序
    rankings.sort((a, b) => b.score - a.score);

    // 更新排名
    rankings.forEach((r, index) => { r.rank = index + 1; });

    return {
      period,
      tier,
      leaderboard: rankings.slice(0, 100),
    };
  }

  /**
   * 构建查询条件
   */
  private buildMealWhere(startDate: Date | undefined) {
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

    return where;
  }

  /**
   * 获取用户映射
   */
  private async getUserMap(tier: string | undefined): Promise<Map<string, { username: string; avatarUrl: string | null }>> {
    const where: any = {
      deletedAt: null,
      OR: [
        { user_settings: { is: null } },
        { user_settings: { hideRanking: false } },
      ],
    };

    if (tier) {
      where.subscriptionTier = tier;
    }

    const users = await this.prisma.user.findMany({
      where,
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

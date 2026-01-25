/**
 * [INPUT]: 依赖 PrismaService 的数据库访问能力
 * [OUTPUT]: 对外提供综合排行榜查询逻辑
 * [POS]: ranking 模块的综合排行榜查询服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [OPTIMIZATION NOTES]
 * 优化前：多次独立查询 + 应用层 Join
 * 优化后：单次 SQL 查询，数据库层完成所有聚合和 Join
 * - 消除 N+1 问题
 * - 减少数据库往返从 3 次到 1 次
 * - 利用数据库索引加速
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, RankingPeriod } from '@prisma/client';
import { LeaderboardDto, LeaderboardEntry } from '../dto/ranking-response.dto';

@Injectable()
export class LeaderboardQuery {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取综合排行榜（优化版 - 单次 SQL 查询）
   *
   * 使用原始 SQL 在数据库层完成：
   * 1. 统计每个用户的餐食数
   * 2. 统计每个用户的去重菜系数
   * 3. 计算得分
   * 4. Join 用户信息
   * 5. 排序并限制返回数量
   */
  async execute(
    period: RankingPeriod,
    tier: string | undefined,
  ): Promise<LeaderboardDto> {
    const { startDate, startDateCondition } = this.getDateRangeSql(period);

    // 单次 SQL 查询完成所有操作
    const rankings = await this.prisma.$queryRaw<Array<{
      userId: string;
      username: string;
      avatarUrl: string | null;
      mealCount: bigint;
      cuisineCount: bigint;
      score: bigint;
    }>>`
      SELECT
        u.id as "userId",
        u.username,
        u."avatarUrl",
        COUNT(m.id) as "mealCount",
        COUNT(DISTINCT m.cuisine) as "cuisineCount",
        (COUNT(m.id) * 10 + COUNT(DISTINCT m.cuisine) * 50) as "score"
      FROM users u
      LEFT JOIN meals m ON m."userId" = u.id
        AND m."deletedAt" IS NULL
        ${startDateCondition}
      LEFT JOIN user_settings us ON us."userId" = u.id
      WHERE u."deletedAt" IS NULL
        AND (us.id IS NULL OR us."hideRanking" = false)
        ${tier ? Prisma.sql`AND u."subscriptionTier" = ${tier}` : Prisma.empty}
      GROUP BY u.id, u.username, u."avatarUrl"
      HAVING COUNT(m.id) > 0
      ORDER BY "score" DESC, "mealCount" DESC
      LIMIT 100
    `;

    return {
      period,
      tier,
      leaderboard: rankings.map((r, index) => ({
        rank: index + 1,
        userId: r.userId,
        username: r.username,
        avatarUrl: r.avatarUrl,
        score: Number(r.score),
        mealCount: Number(r.mealCount),
        cuisineCount: Number(r.cuisineCount),
      })),
    };
  }

  /**
   * 根据时段获取开始日期和 SQL 条件
   */
  private getDateRangeSql(period: RankingPeriod): {
    startDate?: Date;
    startDateCondition: Prisma.Sql;
  } {
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

    const startDateCondition = startDate
      ? Prisma.sql`AND m."createdAt" >= ${startDate}`
      : Prisma.empty;

    return { startDate, startDateCondition };
  }
}

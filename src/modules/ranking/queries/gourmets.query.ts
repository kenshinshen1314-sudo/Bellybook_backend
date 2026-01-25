/**
 * [INPUT]: 依赖 PrismaService 的数据库访问能力
 * [OUTPUT]: 对外提供美食家榜查询逻辑
 * [POS]: ranking 模块的美食家榜查询服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [OPTIMIZATION NOTES]
 * 优化前：$queryRaw + getUserMap() 两次查询
 * 优化后：单次 SQL 查询完成聚合 + 用户 Join
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, RankingPeriod } from '@prisma/client';
import { GourmetsDto, GourmetEntry } from '../dto/ranking-response.dto';

@Injectable()
export class GourmetsQuery {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取美食家榜（优化版 - 单次 SQL 查询）
   * 统计每个用户的去重后菜系数量，倒序展示
   */
  async execute(period: RankingPeriod): Promise<GourmetsDto> {
    const { startDate, startDateCondition } = this.getDateRangeSql(period);

    // 单次 SQL 查询完成所有操作
    const gourmets = await this.prisma.$queryRaw<Array<{
      userId: string;
      username: string;
      avatarUrl: string | null;
      cuisineCount: bigint;
      mealCount: bigint;
    }>>`
      SELECT
        u.id as "userId",
        u.username,
        u."avatarUrl",
        COUNT(DISTINCT m.cuisine) as "cuisineCount",
        COUNT(m.id) as "mealCount"
      FROM users u
      INNER JOIN meals m ON m."userId" = u.id
        AND m."deletedAt" IS NULL
        ${startDateCondition}
      LEFT JOIN user_settings us ON us."userId" = u.id
      WHERE u."deletedAt" IS NULL
        AND (us.id IS NULL OR us."hideRanking" = false)
      GROUP BY u.id, u.username, u."avatarUrl"
      HAVING COUNT(DISTINCT m.cuisine) > 0
      ORDER BY "cuisineCount" DESC
      LIMIT 100
    `;

    return {
      period,
      gourmets: gourmets.map((r, index) => ({
        rank: index + 1,
        userId: r.userId,
        username: r.username,
        avatarUrl: r.avatarUrl,
        cuisineCount: Number(r.cuisineCount),
        mealCount: Number(r.mealCount),
        cuisines: [], // 可选：查询具体菜系
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

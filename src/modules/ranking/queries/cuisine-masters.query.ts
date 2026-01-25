/**
 * [INPUT]: 依赖 PrismaService 的数据库访问能力
 * [OUTPUT]: 对外提供菜系专家榜查询逻辑
 * [POS]: ranking 模块的菜系专家榜查询服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [OPTIMIZATION NOTES]
 * 优化前：groupBy + getUserMap() 两次查询
 * 优化后：单次 SQL 查询完成聚合 + 用户 Join
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, RankingPeriod } from '@prisma/client';
import { CuisineMastersDto, CuisineMasterEntry } from '../dto/ranking-response.dto';

@Injectable()
export class CuisineMastersQuery {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取菜系专家榜（优化版 - 单次 SQL 查询）
   */
  async execute(
    cuisineName: string | undefined,
    period: RankingPeriod,
  ): Promise<CuisineMastersDto> {
    const { startDate, startDateCondition } = this.getDateRangeSql(period);

    // 单次 SQL 查询完成所有操作
    const rankings = await this.prisma.$queryRaw<Array<{
      userId: string;
      username: string;
      avatarUrl: string | null;
      cuisineName: string;
      mealCount: bigint;
      firstMealAt: Date;
    }>>`
      SELECT
        u.id as "userId",
        u.username,
        u."avatarUrl",
        ${cuisineName ? Prisma.sql`${cuisineName}::text as "cuisineName"` : Prisma.sql`'全部菜系'::text as "cuisineName"`},
        COUNT(m.id) as "mealCount",
        MIN(m."createdAt") as "firstMealAt"
      FROM users u
      INNER JOIN meals m ON m."userId" = u.id
        AND m."deletedAt" IS NULL
        ${startDateCondition}
        ${cuisineName ? Prisma.sql`AND m.cuisine = ${cuisineName}` : Prisma.empty}
      LEFT JOIN user_settings us ON us."userId" = u.id
      WHERE u."deletedAt" IS NULL
        AND (us.id IS NULL OR us."hideRanking" = false)
      GROUP BY u.id, u.username, u."avatarUrl"
      HAVING COUNT(m.id) > 0
      ORDER BY "mealCount" DESC, "firstMealAt" ASC
      LIMIT 100
    `;

    return {
      cuisineName,
      period,
      masters: rankings.map((r, index) => ({
        rank: index + 1,
        userId: r.userId,
        username: r.username,
        avatarUrl: r.avatarUrl,
        cuisineName: r.cuisineName,
        mealCount: Number(r.mealCount),
        firstMealAt: r.firstMealAt.toISOString(),
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

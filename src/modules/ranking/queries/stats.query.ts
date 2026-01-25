/**
 * [INPUT]: 依赖 PrismaService 的数据库访问能力
 * [OUTPUT]: 对外提供排行榜统计数据查询
 * [POS]: ranking 模块的统计数据查询服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [OPTIMIZATION NOTES]
 * 优化前：4 次独立查询，uniqueCuisines 使用 findMany + distinct 效率低
 * 优化后：2 次并行查询，使用 COUNT(DISTINCT) 替代 findMany + distinct
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, RankingPeriod } from '@prisma/client';
import { RankingStatsDto } from '../dto/ranking-response.dto';

@Injectable()
export class StatsQuery {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取排行榜统计数据（优化版 - 减少查询次数）
   */
  async execute(period: RankingPeriod): Promise<RankingStatsDto> {
    const { startDate, startDateCondition } = this.getDateRangeSql(period);

    // 并行执行两个查询
    const [userStats, mealStats] = await Promise.all([
      // 查询用户统计（总用户数 + 活跃用户数）
      this.prisma.$queryRaw<Array<{ totalUsers: bigint; activeUsers: bigint }>>`
        SELECT
          (SELECT COUNT(*) FROM users u
           LEFT JOIN user_settings us ON us."userId" = u.id
           WHERE u."deletedAt" IS NULL
             AND (us.id IS NULL OR us."hideRanking" = false)
          ) as "totalUsers",
          (SELECT COUNT(DISTINCT m."userId")
           FROM meals m
           WHERE m."deletedAt" IS NULL
             ${startDateCondition}
          ) as "activeUsers"
      `,
      // 查询餐食统计（总餐食数 + 总菜系数）
      this.prisma.$queryRaw<Array<{ totalMeals: bigint; totalCuisines: bigint }>>`
        SELECT
          COUNT(*) as "totalMeals",
          COUNT(DISTINCT cuisine) as "totalCuisines"
        FROM meals m
        WHERE m."deletedAt" IS NULL
          ${startDateCondition}
      `,
    ]);

    const totalUsers = Number(userStats[0]?.totalUsers || 0);
    const activeUsers = Number(userStats[0]?.activeUsers || 0);
    const totalMeals = Number(mealStats[0]?.totalMeals || 0);
    const totalCuisines = Number(mealStats[0]?.totalCuisines || 0);

    const avgMealsPerUser = totalUsers > 0 ? totalMeals / totalUsers : 0;

    return {
      period,
      totalUsers,
      activeUsers,
      totalMeals,
      totalCuisines,
      avgMealsPerUser: Math.round(avgMealsPerUser * 100) / 100,
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

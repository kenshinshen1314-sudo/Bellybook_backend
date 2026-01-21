/**
 * [INPUT]: 依赖 PrismaService 的数据库访问能力
 * [OUTPUT]: 对外提供排行榜统计数据查询
 * [POS]: ranking 模块的统计数据查询服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, RankingPeriod } from '@prisma/client';
import { RankingStatsDto } from '../dto/ranking-response.dto';

@Injectable()
export class StatsQuery {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取排行榜统计数据
   */
  async execute(period: RankingPeriod): Promise<RankingStatsDto> {
    const { startDate } = this.getDateRange(period);

    const [totalUsers, totalMeals, uniqueCuisines] = await Promise.all([
      this.prisma.user.count({
        where: {
          deletedAt: null,
          OR: [
            { user_settings: { is: null } },
            { user_settings: { hideRanking: false } },
          ],
        },
      }),
      this.prisma.meal.count({
        where: {
          deletedAt: null,
          ...(startDate && { createdAt: { gte: startDate } }),
        },
      }),
      this.prisma.meal.findMany({
        where: {
          deletedAt: null,
          ...(startDate && { createdAt: { gte: startDate } }),
        },
        select: { cuisine: true },
        distinct: ['cuisine'],
      }),
    ]);

    // 统计活跃用户
    const activeUsers = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT "userId") as count
      FROM "meals"
      WHERE "deletedAt" IS NULL
        ${startDate ? Prisma.sql`AND "createdAt" >= ${startDate}` : Prisma.empty}
    `;

    const avgMealsPerUser = totalUsers > 0 ? totalMeals / totalUsers : 0;

    return {
      period,
      totalUsers,
      activeUsers: Number(activeUsers[0]?.count || 0),
      totalMeals,
      totalCuisines: uniqueCuisines.length,
      avgMealsPerUser: Math.round(avgMealsPerUser * 100) / 100,
    };
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

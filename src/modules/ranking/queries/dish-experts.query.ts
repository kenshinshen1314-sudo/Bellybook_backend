/**
 * [INPUT]: 依赖 PrismaService 的数据库访问能力
 * [OUTPUT]: 对外提供菜品专家榜查询逻辑
 * [POS]: ranking 模块的菜品专家榜查询服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [OPTIMIZATION NOTES]
 * 优化前：dish_unlocks.findMany() + getUserMap() 两次查询
 * 优化后：单次 SQL 查询完成聚合 + 用户 Join
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, RankingPeriod } from '@prisma/client';
import { DishExpertsDto, DishExpertEntry } from '../dto/ranking-response.dto';

@Injectable()
export class DishExpertsQuery {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取菜品专家榜（优化版 - 单次 SQL 查询）
   * 统计每个用户的去重后菜品数量，倒序展示
   * 直接从 dish_unlocks 表获取统计数据
   */
  async execute(period: RankingPeriod): Promise<DishExpertsDto> {
    const { startDate, startDateCondition } = this.getDateRangeSql(period);

    // 单次 SQL 查询完成所有操作
    const experts = await this.prisma.$queryRaw<Array<{
      userId: string;
      username: string;
      avatarUrl: string | null;
      dishCount: bigint;
      totalMeals: bigint;
      dishes: string[];
    }>>`
      SELECT
        u.id as "userId",
        u.username,
        u."avatarUrl",
        COUNT(du."dishName") as "dishCount",
        SUM(du."mealCount") as "totalMeals",
        ARRAY_AGG(du."dishName" ORDER BY du."mealCount" DESC) as "dishes"
      FROM users u
      INNER JOIN dish_unlocks du ON du."userId" = u.id
        ${startDateCondition}
      LEFT JOIN user_settings us ON us."userId" = u.id
      WHERE u."deletedAt" IS NULL
        AND (us.id IS NULL OR us."hideRanking" = false)
      GROUP BY u.id, u.username, u."avatarUrl"
      HAVING COUNT(du."dishName") > 0
      ORDER BY "dishCount" DESC
      LIMIT 100
    `;

    return {
      period,
      experts: experts.map((e, index) => ({
        rank: index + 1,
        userId: e.userId,
        username: e.username,
        avatarUrl: e.avatarUrl,
        dishCount: Number(e.dishCount),
        mealCount: Number(e.totalMeals),
        dishes: (e.dishes || []).slice(0, 10),
        cuisines: [], // 可选：查询菜系
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
      ? Prisma.sql`AND du."firstMealAt" >= ${startDate}`
      : Prisma.empty;

    return { startDate, startDateCondition };
  }
}

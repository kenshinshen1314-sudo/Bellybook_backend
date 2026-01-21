/**
 * [INPUT]: 依赖 PrismaService 的数据库访问能力
 * [OUTPUT]: 对外提供美食家榜查询逻辑
 * [POS]: ranking 模块的美食家榜查询服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, RankingPeriod } from '@prisma/client';
import { GourmetsDto, GourmetEntry } from '../dto/ranking-response.dto';

@Injectable()
export class GourmetsQuery {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取美食家榜
   * 统计每个用户的去重后菜系数量，倒序展示
   */
  async execute(period: RankingPeriod): Promise<GourmetsDto> {
    const { startDate } = this.getDateRange(period);

    // 使用原始 SQL 获取用户的去重菜系数和餐食数
    const stats = await this.prisma.$queryRaw<Array<{
      userId: string;
      cuisineCount: bigint;
      mealCount: bigint;
    }>>`
      SELECT
        "userId",
        COUNT(DISTINCT "cuisine") as "cuisineCount",
        COUNT(*) as "mealCount"
      FROM "meals"
      WHERE "deletedAt" IS NULL
        ${startDate ? Prisma.sql`AND "createdAt" >= ${startDate}` : Prisma.empty}
      GROUP BY "userId"
    `;

    const userMap = await this.getUserMap();

    const gourmets: GourmetEntry[] = [];

    for (const stat of stats) {
      const user = userMap.get(stat.userId);
      if (!user) continue;

      gourmets.push({
        rank: 0,
        userId: stat.userId,
        username: user.username,
        avatarUrl: user.avatarUrl,
        cuisineCount: Number(stat.cuisineCount),
        mealCount: Number(stat.mealCount),
        cuisines: [], // 可选：查询具体菜系
      });
    }

    gourmets.sort((a, b) => b.cuisineCount - a.cuisineCount);
    gourmets.forEach((g, index) => { g.rank = index + 1; });

    return {
      period,
      gourmets: gourmets.slice(0, 100),
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

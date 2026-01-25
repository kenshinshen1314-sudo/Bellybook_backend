/**
 * [INPUT]: 依赖 PrismaService 的数据库访问能力
 * [OUTPUT]: 对外提供用户详情相关查询（菜系专家详情、用户菜品清单）
 * [POS]: ranking 模块的用户详情查询服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [OPTIMIZATION NOTES]
 * 优化前：getAllUsersDishes 使用 user.findMany() + meal.findMany() 两次查询
 * 优化后：单次 SQL 查询完成 JOIN + 聚合
 * 优化前：getUserUnlockedDishes 使用 dish_unlocks.findMany() + meal.findMany() 两次查询
 * 优化后：单次 SQL 查询完成 JOIN
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, RankingPeriod } from '@prisma/client';
import {
  CuisineExpertDetailDto,
  CuisineExpertDishEntry,
  AllUsersDishesDto,
  UserUnlockedDishesDto,
  UnlockedDishEntry,
} from '../dto/ranking-response.dto';

@Injectable()
export class UserDetailsQuery {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取菜系专家详情（支持分页）
   * 展示指定用户在指定菜系下的所有菜品
   */
  async getCuisineExpertDetail(
    userId: string,
    cuisineName: string,
    period: RankingPeriod,
    limit = 50,
    offset = 0,
  ): Promise<CuisineExpertDetailDto> {
    const { startDate, startDateCondition } = this.getDateRangeSql(period);

    // 单次查询获取用户和餐食信息
    const result = await this.prisma.$queryRaw<Array<{
      userId: string;
      username: string;
      avatarUrl: string | null;
      foodName: string;
      cuisine: string;
      createdAt: Date;
      imageUrl: string | null;
      calories: number | null;
      notes: string | null;
    }>>`
      SELECT
        u.id as "userId",
        u.username,
        u."avatarUrl",
        m."foodName",
        m.cuisine,
        m."createdAt",
        m."imageUrl",
        m.calories,
        m.notes
      FROM users u
      INNER JOIN meals m ON m."userId" = u.id
        AND m.cuisine = ${cuisineName}
        AND m."deletedAt" IS NULL
        ${startDateCondition}
      WHERE u.id = ${userId}
        AND u."deletedAt" IS NULL
      ORDER BY m."createdAt" DESC
    `;

    if (result.length === 0) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, avatarUrl: true },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return {
        userId: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        cuisineName,
        period,
        totalDishes: 0,
        totalMeals: 0,
        dishes: [],
        offset,
        limit,
        hasMore: false,
      };
    }

    const firstRow = result[0];

    // 按菜品名称分组统计
    const dishStats = new Map<string, CuisineExpertDishEntry>();

    for (const row of result) {
      const existing = dishStats.get(row.foodName);

      if (!existing) {
        dishStats.set(row.foodName, {
          dishName: row.foodName,
          cuisine: row.cuisine,
          mealCount: 1,
          firstMealAt: new Date(row.createdAt).toISOString(),
          lastMealAt: new Date(row.createdAt).toISOString(),
          imageUrl: row.imageUrl || undefined,
          calories: row.calories || undefined,
          notes: row.notes || undefined,
        });
      } else {
        existing.mealCount++;
        existing.lastMealAt = new Date(row.createdAt).toISOString();
      }
    }

    // 转换为数组并按 mealCount 降序排序
    const allDishes = Array.from(dishStats.values()).sort((a, b) => b.mealCount - a.mealCount);

    // 应用分页
    const paginatedDishes = allDishes.slice(offset, offset + limit);

    return {
      userId: firstRow.userId,
      username: firstRow.username,
      avatarUrl: firstRow.avatarUrl,
      cuisineName,
      period,
      totalDishes: allDishes.length,
      totalMeals: result.length,
      dishes: paginatedDishes,
      offset,
      limit,
      hasMore: offset + limit < allDishes.length,
    };
  }

  /**
   * 获取所有用户的菜品清单（优化版 - 单次 SQL 查询）
   * 按"用户+菜系"统计菜品数量，倒序排列
   */
  async getAllUsersDishes(period: RankingPeriod): Promise<AllUsersDishesDto> {
    const { startDate, startDateCondition } = this.getDateRangeSql(period);

    // 单次 SQL 查询完成所有操作
    const entries = await this.prisma.$queryRaw<Array<{
      userId: string;
      username: string;
      avatarUrl: string | null;
      cuisineName: string;
      dishCount: bigint;
      mealCount: bigint;
      firstMealAt: Date;
    }>>`
      SELECT
        u.id as "userId",
        u.username,
        u."avatarUrl",
        m.cuisine as "cuisineName",
        COUNT(DISTINCT m."foodName") as "dishCount",
        COUNT(m.id) as "mealCount",
        MIN(m."createdAt") as "firstMealAt"
      FROM users u
      INNER JOIN meals m ON m."userId" = u.id
        AND m."deletedAt" IS NULL
        ${startDateCondition}
      LEFT JOIN user_settings us ON us."userId" = u.id
      WHERE u."deletedAt" IS NULL
        AND (us.id IS NULL OR us."hideRanking" = false)
      GROUP BY u.id, u.username, u."avatarUrl", m.cuisine
      HAVING COUNT(DISTINCT m."foodName") > 0
      ORDER BY "dishCount" DESC, "firstMealAt" ASC
    `;

    // 添加排名
    const rankedEntries = entries.map((e, index) => ({
      rank: index + 1,
      userId: e.userId,
      username: e.username,
      avatarUrl: e.avatarUrl,
      cuisineName: e.cuisineName,
      dishCount: Number(e.dishCount),
      mealCount: Number(e.mealCount),
      firstMealAt: e.firstMealAt.toISOString(),
    }));

    // 统计总用户数和总菜系数
    const uniqueUsers = new Set(rankedEntries.map(e => e.userId));
    const uniqueCuisines = new Set(rankedEntries.map(e => e.cuisineName));

    return {
      period,
      totalEntries: rankedEntries.length,
      totalUsers: uniqueUsers.size,
      totalCuisines: uniqueCuisines.size,
      entries: rankedEntries,
    };
  }

  /**
   * 获取用户已解锁的菜肴（支持分页）
   * 从 dish_unlocks 表读取用户所有已解锁的菜肴
   */
  async getUserUnlockedDishes(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<UserUnlockedDishesDto> {
    // 首先获取总数统计（不带分页）
    const countResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM dish_unlocks
      WHERE "userId" = ${userId}
    `;

    const totalDishes = Number(countResult[0]?.count || 0);

    // 单次 SQL 查询完成 JOIN（带分页）
    const result = await this.prisma.$queryRaw<Array<{
      userId: string;
      username: string;
      avatarUrl: string | null;
      dishName: string;
      mealCount: bigint;
      firstMealAt: Date;
      lastMealAt: Date | null;
      cuisine: string;
      imageUrl: string | null;
      calories: number | null;
    }>>`
      SELECT
        u.id as "userId",
        u.username,
        u."avatarUrl",
        du."dishName",
        du."mealCount",
        du."firstMealAt",
        du."lastMealAt",
        COALESCE(m.cuisine, '未知') as cuisine,
        m."imageUrl",
        m.calories
      FROM users u
      INNER JOIN dish_unlocks du ON du."userId" = u.id
      LEFT JOIN LATERAL (
        SELECT cuisine, "imageUrl", calories
        FROM meals
        WHERE "userId" = ${userId}
          AND "foodName" = du."dishName"
          AND "deletedAt" IS NULL
        LIMIT 1
      ) m ON true
      WHERE u.id = ${userId}
        AND u."deletedAt" IS NULL
      ORDER BY du."mealCount" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    if (result.length === 0) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, avatarUrl: true },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return {
        userId: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        totalDishes: 0,
        totalMeals: 0,
        dishes: [],
        offset,
        limit,
        hasMore: false,
      };
    }

    const firstRow = result[0];

    // 构建响应数据
    const dishes: UnlockedDishEntry[] = result.map(row => ({
      dishName: row.dishName,
      cuisine: row.cuisine,
      mealCount: Number(row.mealCount),
      firstMealAt: row.firstMealAt.toISOString(),
      lastMealAt: row.lastMealAt?.toISOString() || row.firstMealAt.toISOString(),
      imageUrl: row.imageUrl || undefined,
      calories: row.calories || undefined,
    }));

    // 统计总餐食数
    const totalMeals = dishes.reduce((sum, d) => sum + d.mealCount, 0);

    return {
      userId: firstRow.userId,
      username: firstRow.username,
      avatarUrl: firstRow.avatarUrl,
      totalDishes,
      totalMeals,
      dishes,
      offset,
      limit,
      hasMore: offset + limit < totalDishes,
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

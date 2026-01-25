/**
 * [INPUT]: 依赖 PrismaService 的数据库访问能力、CacheService 的缓存服务
 * [OUTPUT]: 对外提供用户资料、设置、统计、配额管理
 * [POS]: users 模块的核心服务层，被 users.controller、storage.controller 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [PERFORMANCE NOTES]
 * - 用户统计数据使用缓存减少数据库查询
 * - Streak 计算使用日期聚合查询优化
 * - 用户资料和设置使用 @Cacheable 装饰器自动管理缓存
 */
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { User, user_profiles, user_settings } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ProfileResponseDto, SettingsResponseDto, UserStatsDto } from './dto/user-response.dto';
import { CacheService } from '../cache/cache.service';
import { CacheStatsService } from '../cache/cache-stats.service';
import { Cacheable, CacheInvalidate } from '../cache/cache.decorator';
import { CachePrefix, CacheTTL } from '../cache/cache.constants';

/**
 * 用户 upsert 创建数据（用于 updateProfile）
 */
interface UserUpsertCreate {
  id: string;
  username: string;
  passwordHash: string;
  breakfastReminderTime: string;
  lunchReminderTime: string;
  dinnerReminderTime: string;
  user_settings?: {
    create?: Record<string, never>;
  };
  user_profiles?: {
    create: {
      displayName: string;
      bio?: string | null;
      avatarUrl?: string | null;
    };
  };
}

/**
 * 用户设置 upsert 创建数据（用于 updateSettings）
 */
interface UserSettingsUpsertCreate {
  id: string;
  username: string;
  passwordHash: string;
  breakfastReminderTime: string;
  lunchReminderTime: string;
  dinnerReminderTime: string;
  user_settings?: {
    create: UpdateSettingsDto;
  };
}

/**
 * 用户实体（包含关联数据）
 */
interface UserWithRelations extends User {
  user_profiles?: user_profiles | null;
  user_settings?: user_settings | null;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    public cacheService: CacheService,
    public cacheStatsService: CacheStatsService,
  ) {}

  // ============================================================
  // Public Methods
  // ============================================================

  /**
   * 检查用户今日 AI 分析配额
   */
  async checkAnalysisQuota(userId: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        dailyAnalysisCount: true,
        dailyAnalysisReset: true,
        subscriptionTier: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 检查是否需要重置配额（新的一天）
    const now = new Date();
    const resetTime = new Date(user.dailyAnalysisReset);
    const isDifferentDay =
      resetTime.getDate() !== now.getDate() ||
      resetTime.getMonth() !== now.getMonth() ||
      resetTime.getFullYear() !== now.getFullYear();

    if (isDifferentDay || user.dailyAnalysisCount === null) {
      // 重置配额
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          dailyAnalysisCount: 0,
          dailyAnalysisReset: now,
        },
      });
      user.dailyAnalysisCount = 0;
    }

    // 根据会员等级确定限制
    const limits: Record<string, number> = {
      FREE: 10,
      PREMIUM: 50,
      PRO: 1000, // 实际上无限制
    };
    const limit = limits[user.subscriptionTier] || 10;

    const remaining = Math.max(0, limit - user.dailyAnalysisCount);
    const allowed = remaining > 0;

    return { allowed, remaining, limit };
  }

  /**
   * 增加 AI 分析使用次数
   */
  async incrementAnalysisCount(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        dailyAnalysisCount: { increment: 1 },
      },
    });
  }

  /**
   * 获取用户资料（带缓存）
   */
  @Cacheable(CachePrefix.USER_PROFILE, ['userId'], CacheTTL.LONG)
  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { user_profiles: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToProfileResponse(user);
  }

  /**
   * 更新用户资料（带缓存失效）
   */
  @CacheInvalidate(CachePrefix.USER_PROFILE, ['userId'], `${CachePrefix.USER_PROFILE}:*`)
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<ProfileResponseDto> {
    const user = await this.prisma.user.upsert({
      where: { id: userId },
      create: this.buildUserUpsertCreate(userId, dto) as unknown as UserUpsertCreate,
      update: {
        user_profiles: {
          upsert: {
            create: {
              displayName: dto.displayName || '',
              bio: dto.bio,
              avatarUrl: dto.avatarUrl,
            },
            update: dto,
          },
        },
      },
      include: { user_profiles: true },
    });

    return this.mapToProfileResponse(user);
  }

  /**
   * 获取用户设置（带缓存）
   */
  @Cacheable(CachePrefix.USER_SETTINGS, ['userId'], CacheTTL.LONG)
  async getSettings(userId: string): Promise<SettingsResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { user_settings: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToSettingsResponse(user);
  }

  /**
   * 更新用户设置（带缓存失效）
   */
  @CacheInvalidate(CachePrefix.USER_SETTINGS, ['userId'], `${CachePrefix.USER_SETTINGS}:*`)
  async updateSettings(userId: string, dto: UpdateSettingsDto): Promise<SettingsResponseDto> {
    const createData: UserSettingsUpsertCreate = {
      id: userId,
      username: '',
      passwordHash: '',
      breakfastReminderTime: '08:00',
      lunchReminderTime: '12:00',
      dinnerReminderTime: '18:00',
      user_settings: {
        create: dto,
      },
    };

    const user = await this.prisma.user.upsert({
      where: { id: userId },
      update: {
        user_settings: {
          upsert: {
            create: dto,
            update: dto,
          },
        },
      },
      create: createData,
      include: { user_settings: true },
    });

    return this.mapToSettingsResponse(user);
  }

  /**
   * 获取用户统计数据
   */
  async getStats(userId: string): Promise<UserStatsDto> {
    // 使用缓存 - 用户统计数据变化频率较低
    const cacheKey = `${CachePrefix.USER}:${userId}:stats`;
    const cached = await this.cacheService.get<UserStatsDto>(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 使用单个聚合查询获取多个统计数据
    const [totalMeals, totalCuisines, mealsByCuisine, periodCounts] = await Promise.all([
      this.prisma.meal.count({ where: { userId, deletedAt: null } }),
      this.prisma.cuisine_unlocks.count({ where: { userId } }),
      this.prisma.cuisine_unlocks.findMany({
        where: { userId },
        orderBy: { mealCount: 'desc' },
        take: 5,
      }),
      // 使用单个查询获取周/月统计
      this.prisma.$queryRaw<Array<{
        week_count: bigint;
        month_count: bigint;
      }>>`
        SELECT
          COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '7 days') as week_count,
          COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '30 days') as month_count
        FROM meals
        WHERE "userId" = ${userId}
          AND "deletedAt" IS NULL
      `,
    ]);

    const [currentStreak, longestStreak] = await Promise.all([
      this.calculateStreakOptimized(userId),
      this.calculateLongestStreakOptimized(userId),
    ]);

    const result: UserStatsDto = {
      totalMeals,
      totalCuisines,
      currentStreak,
      longestStreak,
      thisWeekMeals: Number(periodCounts[0]?.week_count || 0),
      thisMonthMeals: Number(periodCounts[0]?.month_count || 0),
      favoriteCuisines: mealsByCuisine.map(c => ({
        name: c.cuisineName,
        count: c.mealCount,
      })),
    };

    // 缓存结果（较长的 TTL，因为统计数据变化慢）
    await this.cacheService.set(cacheKey, result, CacheTTL.LONG);

    return result;
  }

  /**
   * 删除用户账户（软删除）
   */
  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: null,
      },
    });

    this.logger.log(`User account deleted: ${userId}`);
  }

  // ============================================================
  // Private Methods - Helpers
  // ============================================================

  /**
   * 构建用户 upsert 创建数据
   */
  private buildUserUpsertCreate(userId: string, dto: UpdateProfileDto): Record<string, unknown> {
    return {
      id: userId,
      username: '',
      passwordHash: '',
      breakfastReminderTime: '08:00',
      lunchReminderTime: '12:00',
      dinnerReminderTime: '18:00',
      user_settings: {
        create: {},
      },
      user_profiles: {
        create: {
          displayName: dto.displayName || '',
          bio: dto.bio,
          avatarUrl: dto.avatarUrl,
        },
      },
    };
  }

  /**
   * 获取一天的开始时间（00:00:00）
   */
  private getStartOfDay(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  // ============================================================
  // Private Methods - Streak Calculations
  // ============================================================

  /**
   * 计算当前连续打卡天数（优化版 - 使用数据库聚合）
   */
  private async calculateStreakOptimized(userId: string): Promise<number> {
    // 使用 SQL 聚合查询直接计算连续天数
    const result = await this.prisma.$queryRaw<Array<{ streak: bigint }>>`
      WITH date_series AS (
        SELECT DISTINCT DATE("createdAt") as date
        FROM meals
        WHERE "userId" = ${userId}
          AND "deletedAt" IS NULL
          AND "createdAt" >= NOW() - INTERVAL '365 days'
        ORDER BY date DESC
        LIMIT 365
      ),
      streak_groups AS (
        SELECT date,
          date - (ROW_NUMBER() OVER (ORDER BY date DESC) || INTERVAL '1 day') as grp
        FROM date_series
      )
      SELECT COUNT(*) as streak
      FROM streak_groups
      WHERE grp = (SELECT grp FROM streak_groups ORDER BY date DESC LIMIT 1)
    `;

    return result[0] ? Number(result[0].streak) : 0;
  }

  /**
   * 计算最长连续打卡天数（优化版 - 使用数据库聚合）
   */
  private async calculateLongestStreakOptimized(userId: string): Promise<number> {
    // 使用 SQL 聚合查询直接计算最长连续天数
    const result = await this.prisma.$queryRaw<Array<{ longest_streak: bigint }>>`
      WITH date_series AS (
        SELECT DISTINCT DATE("createdAt") as date
        FROM meals
        WHERE "userId" = ${userId}
          AND "deletedAt" IS NULL
        ORDER BY date ASC
      ),
      streak_groups AS (
        SELECT date,
          date - (ROW_NUMBER() OVER (ORDER BY date ASC) || INTERVAL '1 day') as grp
        FROM date_series
      )
      SELECT MAX(COUNT(*)) as longest_streak
      FROM streak_groups
      GROUP BY grp
      ORDER BY longest_streak DESC
      LIMIT 1
    `;

    return result[0] ? Number(result[0].longest_streak) : 0;
  }

  /**
   * 计算当前连续打卡天数（旧方法 - 作为备用）
   */
  private async calculateStreak(userId: string): Promise<number> {
    const meals = await this.prisma.meal.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
      take: 365,
    });

    if (meals.length === 0) return 0;

    const uniqueDays = new Set(
      meals.map(m => new Date(m.createdAt).toDateString())
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const dateStr = currentDate.toDateString();
      if (uniqueDays.has(dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * 计算最长连续打卡天数（旧方法 - 作为备用）
   */
  private async calculateLongestStreak(userId: string): Promise<number> {
    const meals = await this.prisma.meal.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    if (meals.length === 0) return 0;

    const uniqueDays = [
      ...new Set(meals.map(m => new Date(m.createdAt).toDateString()))
    ].sort();

    let longestStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < uniqueDays.length; i++) {
      const prev = new Date(uniqueDays[i - 1]);
      const curr = new Date(uniqueDays[i]);
      const diffDays = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
    }

    return longestStreak;
  }

  // ============================================================
  // Private Methods - Mappers
  // ============================================================

  /**
   * 映射用户实体到资料响应
   */
  private mapToProfileResponse(user: UserWithRelations): ProfileResponseDto {
    return {
      id: user.id,
      username: user.username,
      displayName: user.user_profiles?.displayName ?? undefined,
      bio: user.user_profiles?.bio ?? undefined,
      avatarUrl: user.user_profiles?.avatarUrl ?? undefined,
      createdAt: user.createdAt,
    };
  }

  /**
   * 映射用户实体到设置响应
   */
  private mapToSettingsResponse(user: UserWithRelations): SettingsResponseDto {
    const settings = user.user_settings;
    return {
      language: settings?.language as 'ZH' | 'EN' ?? 'ZH',
      theme: settings?.theme as 'LIGHT' | 'DARK' | 'AUTO' ?? 'AUTO',
      notificationsEnabled: settings?.notificationsEnabled ?? true,
      breakfastReminderTime: settings?.breakfastReminderTime ?? undefined,
      lunchReminderTime: settings?.lunchReminderTime ?? undefined,
      dinnerReminderTime: settings?.dinnerReminderTime ?? undefined,
      hideRanking: settings?.hideRanking ?? false,
    };
  }
}

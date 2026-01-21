/**
 * [INPUT]: 依赖 PrismaService 的数据库访问能力
 * [OUTPUT]: 对外提供用户资料、设置、统计、配额管理
 * [POS]: users 模块的核心服务层，被 users.controller、storage.controller 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { User } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ProfileResponseDto, SettingsResponseDto, UserStatsDto } from './dto/user-response.dto';

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

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

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
   * 获取用户资料
   */
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
   * 更新用户资料
   */
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
   * 获取用户设置
   */
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
   * 更新用户设置
   */
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [totalMeals, totalCuisines, mealsByCuisine] = await Promise.all([
      this.prisma.meal.count({ where: { userId, deletedAt: null } }),
      this.prisma.cuisine_unlocks.count({ where: { userId } }),
      this.prisma.cuisine_unlocks.findMany({
        where: { userId },
        orderBy: { mealCount: 'desc' },
        take: 5,
      }),
    ]);

    const today = this.getStartOfDay();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [thisWeekMeals, thisMonthMeals] = await Promise.all([
      this.prisma.meal.count({
        where: {
          userId,
          createdAt: { gte: weekAgo },
          deletedAt: null,
        },
      }),
      this.prisma.meal.count({
        where: {
          userId,
          createdAt: { gte: monthAgo },
          deletedAt: null,
        },
      }),
    ]);

    const [currentStreak, longestStreak] = await Promise.all([
      this.calculateStreak(userId),
      this.calculateLongestStreak(userId),
    ]);

    return {
      totalMeals,
      totalCuisines,
      currentStreak,
      longestStreak,
      thisWeekMeals,
      thisMonthMeals,
      favoriteCuisines: mealsByCuisine.map(c => ({
        name: c.cuisineName,
        count: c.mealCount,
      })),
    };
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
   * 计算当前连续打卡天数
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
   * 计算最长连续打卡天数
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
  private mapToProfileResponse(user: any): ProfileResponseDto {
    return {
      id: user.id,
      username: user.username,
      displayName: user.user_profiles?.displayName || user.displayName || null,
      bio: user.user_profiles?.bio || null,
      avatarUrl: user.user_profiles?.avatarUrl || user.avatarUrl || null,
      createdAt: user.createdAt,
    };
  }

  /**
   * 映射用户实体到设置响应
   */
  private mapToSettingsResponse(user: any): SettingsResponseDto {
    const settings = user.user_settings || {};
    return {
      language: settings.language || 'ZH',
      theme: settings.theme || 'AUTO',
      notificationsEnabled: settings.notificationsEnabled ?? true,
      breakfastReminderTime: settings.breakfastReminderTime || null,
      lunchReminderTime: settings.lunchReminderTime || null,
      dinnerReminderTime: settings.dinnerReminderTime || null,
      hideRanking: settings.hideRanking || false,
    };
  }
}

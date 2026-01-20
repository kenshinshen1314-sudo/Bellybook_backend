import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ProfileResponseDto, SettingsResponseDto, UserStatsDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

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

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<ProfileResponseDto> {
    const user = await this.prisma.user.upsert({
      where: { id: userId },
      create: {
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
      } as any,
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

  async updateSettings(userId: string, dto: UpdateSettingsDto): Promise<SettingsResponseDto> {
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
      create: {
        id: userId,
        username: '',
        passwordHash: '',
        breakfastReminderTime: '08:00',
        lunchReminderTime: '12:00',
        dinnerReminderTime: '18:00',
        user_settings: {
          create: dto,
        },
      },
      include: { user_settings: true },
    } as any);

    return this.mapToSettingsResponse(user);
  }

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

    const currentStreak = await this.calculateStreak(userId);
    const longestStreak = await this.calculateLongestStreak(userId);

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

  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: null,
      },
    });
  }

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

  private async calculateLongestStreak(userId: string): Promise<number> {
    const meals = await this.prisma.meal.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    if (meals.length === 0) return 0;

    const uniqueDays = [
      ...new Set(meals.map(m => new Date(m.createdAt).toDateString()))
    ].sort() as string[];

    let longestStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < uniqueDays.length; i++) {
      const prev = new Date(uniqueDays[i - 1] as string);
      const curr = new Date(uniqueDays[i] as string);
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

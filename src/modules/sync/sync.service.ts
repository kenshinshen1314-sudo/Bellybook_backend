import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  SyncPullResponseDto,
  SyncPushRequestDto,
  SyncPushResponseDto,
  SyncStatusResponseDto,
  SyncPushPayload,
  CuisineUnlockDto,
  MealResponseDto,
  ProfileResponseDto,
  SettingsResponseDto
} from './dto/sync.dto';
import type { Meal, user_profiles, user_settings, cuisine_unlocks } from '@prisma/client';

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  async pull(userId: string, lastSyncAt?: Date): Promise<SyncPullResponseDto> {
    const where = lastSyncAt ? { userId, createdAt: { gt: lastSyncAt } } : { userId };

    const [meals, profile, settings, cuisineUnlocks] = await Promise.all([
      this.prisma.meal.findMany({
        where: { ...where, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.user_profiles.findUnique({
        where: { userId },
      }),
      this.prisma.user_settings.findUnique({
        where: { userId },
      }),
      this.prisma.cuisine_unlocks.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      meals: meals.map(m => this.mapToMealResponse(m)),
      profile: profile ? this.mapToProfileResponse(profile) : undefined,
      settings: settings ? this.mapToSettingsResponse(settings) : undefined,
      cuisineUnlocks: cuisineUnlocks.map(u => this.mapToCuisineUnlockResponse(u)),
      serverTime: new Date().toISOString(),
      hasMore: meals.length === 100,
    };
  }

  async push(userId: string, dto: SyncPushRequestDto): Promise<SyncPushResponseDto> {
    const success: string[] = [];
    const failed: Array<{ clientId: string; error: string; code: string }> = [];
    const conflicts: Array<{ clientId: string; type: string; serverVersion: number; clientVersion: number }> = [];

    for (const item of dto.items) {
      try {
        switch (item.type) {
          case 'CREATE_MEAL':
            await this.handleCreateMeal(userId, item.payload);
            success.push(item.clientId);
            break;

          case 'UPDATE_MEAL':
            await this.handleUpdateMeal(userId, item.payload);
            success.push(item.clientId);
            break;

          case 'DELETE_MEAL':
            await this.handleDeleteMeal(userId, item.payload);
            success.push(item.clientId);
            break;

          case 'UPDATE_PROFILE':
            await this.handleUpdateProfile(userId, item.payload);
            success.push(item.clientId);
            break;

          case 'UPDATE_SETTINGS':
            await this.handleUpdateSettings(userId, item.payload);
            success.push(item.clientId);
            break;

          default:
            failed.push({
              clientId: item.clientId,
              error: `Unknown operation type: ${item.type}`,
              code: 'UNKNOWN_OPERATION',
            });
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorCode = error instanceof Error && 'code' in error ? String(error.code) : 'SYNC_ERROR';
        failed.push({
          clientId: item.clientId,
          error: errorMessage,
          code: errorCode,
        });
      }
    }

    return {
      success,
      failed,
      conflicts,
      serverTime: new Date().toISOString(),
    };
  }

  async getStatus(userId: string): Promise<SyncStatusResponseDto> {
    const pendingCount = await this.prisma.sync_queues.count({
      where: { userId, status: 'PENDING' },
    });

    const lastSync = await this.prisma.sync_logs.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      pendingItems: pendingCount,
      lastSyncAt: lastSync?.createdAt.toISOString(),
      serverTime: new Date().toISOString(),
      isHealthy: pendingCount < 100,
    };
  }

  async clearQueue(userId: string): Promise<void> {
    await this.prisma.sync_queues.deleteMany({
      where: { userId },
    });
  }

  private async handleCreateMeal(userId: string, payload: SyncPushPayload): Promise<void> {
    await this.prisma.meal.create({
      data: {
        userId,
        ...(payload as Record<string, unknown>) as Record<string, unknown>,
      } as never,
    });
  }

  private async handleUpdateMeal(userId: string, payload: SyncPushPayload): Promise<void> {
    const p = payload as { id: string; version: number; [key: string]: unknown };
    const { id, version, ...data } = p;

    const meal = await this.prisma.meal.findFirst({
      where: { id, userId },
    });

    if (!meal) {
      throw new NotFoundException('Meal not found');
    }

    if (meal.version !== version) {
      throw new ConflictException('Version conflict');
    }

    await this.prisma.meal.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
    });
  }

  private async handleDeleteMeal(userId: string, payload: SyncPushPayload): Promise<void> {
    const p = payload as { id: string };
    const meal = await this.prisma.meal.findFirst({
      where: { id: p.id, userId },
    });

    if (!meal) {
      throw new NotFoundException('Meal not found');
    }

    await this.prisma.meal.update({
      where: { id: p.id },
      data: { deletedAt: new Date() },
    });
  }

  private async handleUpdateProfile(userId: string, payload: SyncPushPayload): Promise<void> {
    await this.prisma.user_profiles.upsert({
      where: { userId },
      create: {
        id: crypto.randomUUID(),
        userId,
        ...(payload as Record<string, unknown>),
      } as never,
      update: (payload as Record<string, unknown>) as never,
    });
  }

  private async handleUpdateSettings(userId: string, payload: SyncPushPayload): Promise<void> {
    await this.prisma.user_settings.upsert({
      where: { userId },
      create: {
        id: crypto.randomUUID(),
        userId,
        ...(payload as Record<string, unknown>),
      } as never,
      update: (payload as Record<string, unknown>) as never,
    });
  }

  private mapToMealResponse(meal: Meal): MealResponseDto {
    return {
      id: meal.id,
      userId: meal.userId,
      imageUrl: meal.imageUrl,
      thumbnailUrl: meal.thumbnailUrl ?? undefined,
      analysis: meal.analysis as unknown as MealResponseDto['analysis'],
      mealType: meal.mealType,
      notes: meal.notes ?? undefined,
      createdAt: meal.createdAt,
      updatedAt: meal.updatedAt,
      isSynced: meal.isSynced,
      version: meal.version,
    };
  }

  private mapToProfileResponse(profile: user_profiles): ProfileResponseDto {
    return {
      id: profile.userId,
      username: '',
      displayName: profile.displayName ?? undefined,
      bio: profile.bio ?? undefined,
      avatarUrl: profile.avatarUrl ?? undefined,
      createdAt: profile.createdAt,
    };
  }

  private mapToSettingsResponse(settings: user_settings): SettingsResponseDto {
    return {
      language: settings.language as 'ZH' | 'EN',
      theme: settings.theme as 'LIGHT' | 'DARK' | 'AUTO',
      notificationsEnabled: settings.notificationsEnabled,
      breakfastReminderTime: settings.breakfastReminderTime ?? undefined,
      lunchReminderTime: settings.lunchReminderTime ?? undefined,
      dinnerReminderTime: settings.dinnerReminderTime ?? undefined,
      hideRanking: settings.hideRanking,
    };
  }

  private mapToCuisineUnlockResponse(unlock: cuisine_unlocks): CuisineUnlockDto {
    return {
      cuisineName: unlock.cuisineName,
      icon: unlock.cuisineIcon ?? undefined,
      color: unlock.cuisineColor ?? undefined,
      firstMealAt: unlock.firstMealAt,
      mealCount: unlock.mealCount,
      lastMealAt: unlock.lastMealAt ?? undefined,
    };
  }
}

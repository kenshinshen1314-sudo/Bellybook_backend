import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SyncPullResponseDto, SyncPushRequestDto, SyncPushResponseDto, SyncStatusResponseDto } from './dto/sync.dto';

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
    const conflicts: Array<{ clientId: string; type: string; serverVersion: any; clientVersion: any }> = [];

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
      } catch (error: any) {
        failed.push({
          clientId: item.clientId,
          error: error.message || 'Unknown error',
          code: error.code || 'SYNC_ERROR',
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

  private async handleCreateMeal(userId: string, payload: any): Promise<void> {
    await this.prisma.meal.create({
      data: {
        userId,
        ...payload,
      },
    });
  }

  private async handleUpdateMeal(userId: string, payload: any): Promise<void> {
    const { id, version, ...data } = payload;

    const meal = await this.prisma.meal.findFirst({
      where: { id, userId },
    });

    if (!meal) {
      throw new Error('Meal not found');
    }

    if (meal.version !== version) {
      throw new Error('Version conflict');
    }

    await this.prisma.meal.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
    });
  }

  private async handleDeleteMeal(userId: string, payload: any): Promise<void> {
    const meal = await this.prisma.meal.findFirst({
      where: { id: payload.id, userId },
    });

    if (!meal) {
      throw new Error('Meal not found');
    }

    await this.prisma.meal.update({
      where: { id: payload.id },
      data: { deletedAt: new Date() },
    });
  }

  private async handleUpdateProfile(userId: string, payload: any): Promise<void> {
    await this.prisma.user_profiles.upsert({
      where: { userId },
      create: { id: crypto.randomUUID(), userId, ...payload },
      update: { ...payload },
    });
  }

  private async handleUpdateSettings(userId: string, payload: any): Promise<void> {
    await this.prisma.user_settings.upsert({
      where: { userId },
      create: { id: crypto.randomUUID(), userId, ...payload },
      update: { ...payload },
    });
  }

  private mapToMealResponse(meal: any): any {
    return {
      id: meal.id,
      userId: meal.userId,
      imageUrl: meal.imageUrl,
      thumbnailUrl: meal.thumbnailUrl,
      analysis: meal.analysis,
      mealType: meal.mealType,
      notes: meal.notes,
      createdAt: meal.createdAt,
      updatedAt: meal.updatedAt,
      isSynced: meal.isSynced,
      version: meal.version,
    };
  }

  private mapToProfileResponse(profile: any): any {
    return {
      id: profile.userId,
      username: '',
      displayName: profile.displayName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      createdAt: profile.createdAt,
    };
  }

  private mapToSettingsResponse(settings: any): any {
    return {
      language: settings.language,
      theme: settings.theme,
      notificationsEnabled: settings.notificationsEnabled,
      reminderTime: settings.reminderTime,
      hideRanking: settings.hideRanking,
    };
  }

  private mapToCuisineUnlockResponse(unlock: any): any {
    return {
      cuisineName: unlock.cuisineName,
      icon: unlock.cuisineIcon,
      color: unlock.cuisineColor,
      firstMealAt: unlock.firstMealAt,
      mealCount: unlock.mealCount,
      lastMealAt: unlock.lastMealAt,
    };
  }
}

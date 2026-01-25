"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let SyncService = class SyncService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async pull(userId, lastSyncAt) {
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
    async push(userId, dto) {
        const success = [];
        const failed = [];
        const conflicts = [];
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
            }
            catch (error) {
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
    async getStatus(userId) {
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
    async clearQueue(userId) {
        await this.prisma.sync_queues.deleteMany({
            where: { userId },
        });
    }
    async handleCreateMeal(userId, payload) {
        await this.prisma.meal.create({
            data: {
                userId,
                ...payload,
            },
        });
    }
    async handleUpdateMeal(userId, payload) {
        const p = payload;
        const { id, version, ...data } = p;
        const meal = await this.prisma.meal.findFirst({
            where: { id, userId },
        });
        if (!meal) {
            throw new common_1.NotFoundException('Meal not found');
        }
        if (meal.version !== version) {
            throw new common_1.ConflictException('Version conflict');
        }
        await this.prisma.meal.update({
            where: { id },
            data: { ...data, version: { increment: 1 } },
        });
    }
    async handleDeleteMeal(userId, payload) {
        const p = payload;
        const meal = await this.prisma.meal.findFirst({
            where: { id: p.id, userId },
        });
        if (!meal) {
            throw new common_1.NotFoundException('Meal not found');
        }
        await this.prisma.meal.update({
            where: { id: p.id },
            data: { deletedAt: new Date() },
        });
    }
    async handleUpdateProfile(userId, payload) {
        await this.prisma.user_profiles.upsert({
            where: { userId },
            create: {
                id: crypto.randomUUID(),
                userId,
                ...payload,
            },
            update: payload,
        });
    }
    async handleUpdateSettings(userId, payload) {
        await this.prisma.user_settings.upsert({
            where: { userId },
            create: {
                id: crypto.randomUUID(),
                userId,
                ...payload,
            },
            update: payload,
        });
    }
    mapToMealResponse(meal) {
        return {
            id: meal.id,
            userId: meal.userId,
            imageUrl: meal.imageUrl,
            thumbnailUrl: meal.thumbnailUrl ?? undefined,
            analysis: meal.analysis,
            mealType: meal.mealType,
            notes: meal.notes ?? undefined,
            createdAt: meal.createdAt,
            updatedAt: meal.updatedAt,
            isSynced: meal.isSynced,
            version: meal.version,
        };
    }
    mapToProfileResponse(profile) {
        return {
            id: profile.userId,
            username: '',
            displayName: profile.displayName ?? undefined,
            bio: profile.bio ?? undefined,
            avatarUrl: profile.avatarUrl ?? undefined,
            createdAt: profile.createdAt,
        };
    }
    mapToSettingsResponse(settings) {
        return {
            language: settings.language,
            theme: settings.theme,
            notificationsEnabled: settings.notificationsEnabled,
            breakfastReminderTime: settings.breakfastReminderTime ?? undefined,
            lunchReminderTime: settings.lunchReminderTime ?? undefined,
            dinnerReminderTime: settings.dinnerReminderTime ?? undefined,
            hideRanking: settings.hideRanking,
        };
    }
    mapToCuisineUnlockResponse(unlock) {
        return {
            cuisineName: unlock.cuisineName,
            icon: unlock.cuisineIcon ?? undefined,
            color: unlock.cuisineColor ?? undefined,
            firstMealAt: unlock.firstMealAt,
            mealCount: unlock.mealCount,
            lastMealAt: unlock.lastMealAt ?? undefined,
        };
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SyncService);
//# sourceMappingURL=sync.service.js.map
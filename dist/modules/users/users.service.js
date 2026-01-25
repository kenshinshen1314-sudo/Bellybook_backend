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
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const update_settings_dto_1 = require("./dto/update-settings.dto");
const cache_service_1 = require("../cache/cache.service");
const cache_stats_service_1 = require("../cache/cache-stats.service");
const cache_decorator_1 = require("../cache/cache.decorator");
const cache_constants_1 = require("../cache/cache.constants");
let UsersService = UsersService_1 = class UsersService {
    prisma;
    cacheService;
    cacheStatsService;
    logger = new common_1.Logger(UsersService_1.name);
    constructor(prisma, cacheService, cacheStatsService) {
        this.prisma = prisma;
        this.cacheService = cacheService;
        this.cacheStatsService = cacheStatsService;
    }
    async checkAnalysisQuota(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                dailyAnalysisCount: true,
                dailyAnalysisReset: true,
                subscriptionTier: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const now = new Date();
        const resetTime = new Date(user.dailyAnalysisReset);
        const isDifferentDay = resetTime.getDate() !== now.getDate() ||
            resetTime.getMonth() !== now.getMonth() ||
            resetTime.getFullYear() !== now.getFullYear();
        if (isDifferentDay || user.dailyAnalysisCount === null) {
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    dailyAnalysisCount: 0,
                    dailyAnalysisReset: now,
                },
            });
            user.dailyAnalysisCount = 0;
        }
        const limits = {
            FREE: 10,
            PREMIUM: 50,
            PRO: 1000,
        };
        const limit = limits[user.subscriptionTier] || 10;
        const remaining = Math.max(0, limit - user.dailyAnalysisCount);
        const allowed = remaining > 0;
        return { allowed, remaining, limit };
    }
    async incrementAnalysisCount(userId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                dailyAnalysisCount: { increment: 1 },
            },
        });
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { user_profiles: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return this.mapToProfileResponse(user);
    }
    async updateProfile(userId, dto) {
        const user = await this.prisma.user.upsert({
            where: { id: userId },
            create: this.buildUserUpsertCreate(userId, dto),
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
    async getSettings(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { user_settings: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return this.mapToSettingsResponse(user);
    }
    async updateSettings(userId, dto) {
        const createData = {
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
    async getStats(userId) {
        const cacheKey = `${cache_constants_1.CachePrefix.USER}:${userId}:stats`;
        const cached = await this.cacheService.get(cacheKey);
        if (cached)
            return cached;
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const [totalMeals, totalCuisines, mealsByCuisine, periodCounts] = await Promise.all([
            this.prisma.meal.count({ where: { userId, deletedAt: null } }),
            this.prisma.cuisine_unlocks.count({ where: { userId } }),
            this.prisma.cuisine_unlocks.findMany({
                where: { userId },
                orderBy: { mealCount: 'desc' },
                take: 5,
            }),
            this.prisma.$queryRaw `
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
        const result = {
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
        await this.cacheService.set(cacheKey, result, cache_constants_1.CacheTTL.LONG);
        return result;
    }
    async deleteAccount(userId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                deletedAt: new Date(),
                email: null,
            },
        });
        this.logger.log(`User account deleted: ${userId}`);
    }
    buildUserUpsertCreate(userId, dto) {
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
    getStartOfDay() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    }
    async calculateStreakOptimized(userId) {
        const result = await this.prisma.$queryRaw `
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
    async calculateLongestStreakOptimized(userId) {
        const result = await this.prisma.$queryRaw `
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
    async calculateStreak(userId) {
        const meals = await this.prisma.meal.findMany({
            where: { userId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
            take: 365,
        });
        if (meals.length === 0)
            return 0;
        const uniqueDays = new Set(meals.map(m => new Date(m.createdAt).toDateString()));
        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        for (let i = 0; i < 365; i++) {
            const dateStr = currentDate.toDateString();
            if (uniqueDays.has(dateStr)) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            }
            else {
                break;
            }
        }
        return streak;
    }
    async calculateLongestStreak(userId) {
        const meals = await this.prisma.meal.findMany({
            where: { userId, deletedAt: null },
            orderBy: { createdAt: 'asc' },
            select: { createdAt: true },
        });
        if (meals.length === 0)
            return 0;
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
            }
            else if (diffDays > 1) {
                currentStreak = 1;
            }
        }
        return longestStreak;
    }
    mapToProfileResponse(user) {
        return {
            id: user.id,
            username: user.username,
            displayName: user.user_profiles?.displayName ?? undefined,
            bio: user.user_profiles?.bio ?? undefined,
            avatarUrl: user.user_profiles?.avatarUrl ?? undefined,
            createdAt: user.createdAt,
        };
    }
    mapToSettingsResponse(user) {
        const settings = user.user_settings;
        return {
            language: settings?.language ?? 'ZH',
            theme: settings?.theme ?? 'AUTO',
            notificationsEnabled: settings?.notificationsEnabled ?? true,
            breakfastReminderTime: settings?.breakfastReminderTime ?? undefined,
            lunchReminderTime: settings?.lunchReminderTime ?? undefined,
            dinnerReminderTime: settings?.dinnerReminderTime ?? undefined,
            hideRanking: settings?.hideRanking ?? false,
        };
    }
};
exports.UsersService = UsersService;
__decorate([
    (0, cache_decorator_1.Cacheable)(cache_constants_1.CachePrefix.USER_PROFILE, ['userId'], cache_constants_1.CacheTTL.LONG),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersService.prototype, "getProfile", null);
__decorate([
    (0, cache_decorator_1.CacheInvalidate)(cache_constants_1.CachePrefix.USER_PROFILE, ['userId'], `${cache_constants_1.CachePrefix.USER_PROFILE}:*`),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", Promise)
], UsersService.prototype, "updateProfile", null);
__decorate([
    (0, cache_decorator_1.Cacheable)(cache_constants_1.CachePrefix.USER_SETTINGS, ['userId'], cache_constants_1.CacheTTL.LONG),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersService.prototype, "getSettings", null);
__decorate([
    (0, cache_decorator_1.CacheInvalidate)(cache_constants_1.CachePrefix.USER_SETTINGS, ['userId'], `${cache_constants_1.CachePrefix.USER_SETTINGS}:*`),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_settings_dto_1.UpdateSettingsDto]),
    __metadata("design:returntype", Promise)
], UsersService.prototype, "updateSettings", null);
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService,
        cache_stats_service_1.CacheStatsService])
], UsersService);
//# sourceMappingURL=users.service.js.map
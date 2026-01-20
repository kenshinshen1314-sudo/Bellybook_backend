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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
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
            },
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
        });
        return this.mapToSettingsResponse(user);
    }
    async getStats(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
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
    async deleteAccount(userId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                deletedAt: new Date(),
                email: null,
            },
        });
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
            displayName: user.user_profiles?.displayName || user.displayName || null,
            bio: user.user_profiles?.bio || null,
            avatarUrl: user.user_profiles?.avatarUrl || user.avatarUrl || null,
            createdAt: user.createdAt,
        };
    }
    mapToSettingsResponse(user) {
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
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map
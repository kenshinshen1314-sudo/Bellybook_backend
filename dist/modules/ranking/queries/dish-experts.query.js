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
exports.DishExpertsQuery = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../database/prisma.service");
const client_1 = require("@prisma/client");
let DishExpertsQuery = class DishExpertsQuery {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async execute(period) {
        const { startDate } = this.getDateRange(period);
        const unlocks = await this.prisma.dish_unlocks.findMany({
            where: startDate ? { firstMealAt: { gte: startDate } } : {},
            select: {
                userId: true,
                dishName: true,
                mealCount: true,
            },
        });
        const userStats = new Map();
        for (const unlock of unlocks) {
            const existing = userStats.get(unlock.userId);
            if (!existing) {
                userStats.set(unlock.userId, {
                    count: 1,
                    totalMeals: unlock.mealCount,
                    dishes: [unlock.dishName],
                });
            }
            else {
                existing.count++;
                existing.totalMeals += unlock.mealCount;
                existing.dishes.push(unlock.dishName);
            }
        }
        const userMap = await this.getUserMap();
        const experts = [];
        for (const [userId, stats] of userStats.entries()) {
            const user = userMap.get(userId);
            if (!user)
                continue;
            experts.push({
                rank: 0,
                userId,
                username: user.username,
                avatarUrl: user.avatarUrl,
                dishCount: stats.count,
                mealCount: stats.totalMeals,
                dishes: stats.dishes.slice(0, 10),
                cuisines: [],
            });
        }
        experts.sort((a, b) => b.dishCount - a.dishCount);
        experts.forEach((e, index) => { e.rank = index + 1; });
        return {
            period,
            experts: experts.slice(0, 100),
        };
    }
    async getUserMap() {
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
    getDateRange(period) {
        const now = new Date();
        let startDate;
        switch (period) {
            case client_1.RankingPeriod.WEEKLY:
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                break;
            case client_1.RankingPeriod.MONTHLY:
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                break;
            case client_1.RankingPeriod.YEARLY:
                startDate = new Date(now);
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            case client_1.RankingPeriod.ALL_TIME:
            default:
                startDate = undefined;
                break;
        }
        return { startDate };
    }
};
exports.DishExpertsQuery = DishExpertsQuery;
exports.DishExpertsQuery = DishExpertsQuery = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DishExpertsQuery);
//# sourceMappingURL=dish-experts.query.js.map
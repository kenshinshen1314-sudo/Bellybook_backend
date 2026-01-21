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
exports.LeaderboardQuery = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../database/prisma.service");
const client_1 = require("@prisma/client");
let LeaderboardQuery = class LeaderboardQuery {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async execute(period, tier) {
        const { startDate } = this.getDateRange(period);
        const mealCounts = await this.prisma.meal.groupBy({
            by: ['userId'],
            where: this.buildMealWhere(startDate),
            _count: { id: true },
            _sum: { calories: true },
        });
        const uniqueCuisineCounts = await this.prisma.$queryRaw `
      SELECT "userId", COUNT(DISTINCT "cuisine") as count
      FROM "meals"
      WHERE "deletedAt" IS NULL
        ${startDate ? client_1.Prisma.sql `AND "createdAt" >= ${startDate}` : client_1.Prisma.empty}
      GROUP BY "userId"
    `;
        const userMap = await this.getUserMap(tier);
        const mealCountMap = new Map(mealCounts.map(m => [m.userId, m._count.id]));
        const cuisineCountMap = new Map(uniqueCuisineCounts.map(m => [m.userId, Number(m.count)]));
        const rankings = [];
        for (const [userId, mealCount] of mealCountMap) {
            const user = userMap.get(userId);
            if (!user)
                continue;
            const cuisineCount = cuisineCountMap.get(userId) || 0;
            const score = mealCount * 10 + cuisineCount * 50;
            rankings.push({
                rank: 0,
                userId,
                username: user.username,
                avatarUrl: user.avatarUrl,
                score,
                mealCount,
                cuisineCount,
            });
        }
        rankings.sort((a, b) => b.score - a.score);
        rankings.forEach((r, index) => { r.rank = index + 1; });
        return {
            period,
            tier,
            leaderboard: rankings.slice(0, 100),
        };
    }
    buildMealWhere(startDate) {
        const where = {
            deletedAt: null,
            users: {
                OR: [
                    { user_settings: { is: null } },
                    { user_settings: { hideRanking: false } },
                ],
            },
        };
        if (startDate) {
            where.createdAt = { gte: startDate };
        }
        return where;
    }
    async getUserMap(tier) {
        const where = {
            deletedAt: null,
            OR: [
                { user_settings: { is: null } },
                { user_settings: { hideRanking: false } },
            ],
        };
        if (tier) {
            where.subscriptionTier = tier;
        }
        const users = await this.prisma.user.findMany({
            where,
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
exports.LeaderboardQuery = LeaderboardQuery;
exports.LeaderboardQuery = LeaderboardQuery = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LeaderboardQuery);
//# sourceMappingURL=leaderboard.query.js.map
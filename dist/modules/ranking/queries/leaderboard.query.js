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
        const { startDate, startDateCondition } = this.getDateRangeSql(period);
        const rankings = await this.prisma.$queryRaw `
      SELECT
        u.id as "userId",
        u.username,
        u."avatarUrl",
        COUNT(m.id) as "mealCount",
        COUNT(DISTINCT m.cuisine) as "cuisineCount",
        (COUNT(m.id) * 10 + COUNT(DISTINCT m.cuisine) * 50) as "score"
      FROM users u
      LEFT JOIN meals m ON m."userId" = u.id
        AND m."deletedAt" IS NULL
        ${startDateCondition}
      LEFT JOIN user_settings us ON us."userId" = u.id
      WHERE u."deletedAt" IS NULL
        AND (us.id IS NULL OR us."hideRanking" = false)
        ${tier ? client_1.Prisma.sql `AND u."subscriptionTier" = ${tier}` : client_1.Prisma.empty}
      GROUP BY u.id, u.username, u."avatarUrl"
      HAVING COUNT(m.id) > 0
      ORDER BY "score" DESC, "mealCount" DESC
      LIMIT 100
    `;
        return {
            period,
            tier,
            leaderboard: rankings.map((r, index) => ({
                rank: index + 1,
                userId: r.userId,
                username: r.username,
                avatarUrl: r.avatarUrl,
                score: Number(r.score),
                mealCount: Number(r.mealCount),
                cuisineCount: Number(r.cuisineCount),
            })),
        };
    }
    getDateRangeSql(period) {
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
        const startDateCondition = startDate
            ? client_1.Prisma.sql `AND m."createdAt" >= ${startDate}`
            : client_1.Prisma.empty;
        return { startDate, startDateCondition };
    }
};
exports.LeaderboardQuery = LeaderboardQuery;
exports.LeaderboardQuery = LeaderboardQuery = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LeaderboardQuery);
//# sourceMappingURL=leaderboard.query.js.map
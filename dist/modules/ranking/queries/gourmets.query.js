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
exports.GourmetsQuery = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../database/prisma.service");
const client_1 = require("@prisma/client");
let GourmetsQuery = class GourmetsQuery {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async execute(period) {
        const { startDate } = this.getDateRange(period);
        const stats = await this.prisma.$queryRaw `
      SELECT
        "userId",
        COUNT(DISTINCT "cuisine") as "cuisineCount",
        COUNT(*) as "mealCount"
      FROM "meals"
      WHERE "deletedAt" IS NULL
        ${startDate ? client_1.Prisma.sql `AND "createdAt" >= ${startDate}` : client_1.Prisma.empty}
      GROUP BY "userId"
    `;
        const userMap = await this.getUserMap();
        const gourmets = [];
        for (const stat of stats) {
            const user = userMap.get(stat.userId);
            if (!user)
                continue;
            gourmets.push({
                rank: 0,
                userId: stat.userId,
                username: user.username,
                avatarUrl: user.avatarUrl,
                cuisineCount: Number(stat.cuisineCount),
                mealCount: Number(stat.mealCount),
                cuisines: [],
            });
        }
        gourmets.sort((a, b) => b.cuisineCount - a.cuisineCount);
        gourmets.forEach((g, index) => { g.rank = index + 1; });
        return {
            period,
            gourmets: gourmets.slice(0, 100),
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
exports.GourmetsQuery = GourmetsQuery;
exports.GourmetsQuery = GourmetsQuery = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GourmetsQuery);
//# sourceMappingURL=gourmets.query.js.map
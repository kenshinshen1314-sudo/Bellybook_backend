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
        const { startDate, startDateCondition } = this.getDateRangeSql(period);
        const gourmets = await this.prisma.$queryRaw `
      SELECT
        u.id as "userId",
        u.username,
        u."avatarUrl",
        COUNT(DISTINCT m.cuisine) as "cuisineCount",
        COUNT(m.id) as "mealCount"
      FROM users u
      INNER JOIN meals m ON m."userId" = u.id
        AND m."deletedAt" IS NULL
        ${startDateCondition}
      LEFT JOIN user_settings us ON us."userId" = u.id
      WHERE u."deletedAt" IS NULL
        AND (us.id IS NULL OR us."hideRanking" = false)
      GROUP BY u.id, u.username, u."avatarUrl"
      HAVING COUNT(DISTINCT m.cuisine) > 0
      ORDER BY "cuisineCount" DESC
      LIMIT 100
    `;
        return {
            period,
            gourmets: gourmets.map((r, index) => ({
                rank: index + 1,
                userId: r.userId,
                username: r.username,
                avatarUrl: r.avatarUrl,
                cuisineCount: Number(r.cuisineCount),
                mealCount: Number(r.mealCount),
                cuisines: [],
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
exports.GourmetsQuery = GourmetsQuery;
exports.GourmetsQuery = GourmetsQuery = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GourmetsQuery);
//# sourceMappingURL=gourmets.query.js.map
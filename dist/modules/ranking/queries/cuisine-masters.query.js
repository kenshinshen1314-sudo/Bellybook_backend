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
exports.CuisineMastersQuery = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../database/prisma.service");
const client_1 = require("@prisma/client");
let CuisineMastersQuery = class CuisineMastersQuery {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async execute(cuisineName, period) {
        const { startDate, startDateCondition } = this.getDateRangeSql(period);
        const rankings = await this.prisma.$queryRaw `
      SELECT
        u.id as "userId",
        u.username,
        u."avatarUrl",
        ${cuisineName ? client_1.Prisma.sql `${cuisineName}::text as "cuisineName"` : client_1.Prisma.sql `'全部菜系'::text as "cuisineName"`},
        COUNT(m.id) as "mealCount",
        MIN(m."createdAt") as "firstMealAt"
      FROM users u
      INNER JOIN meals m ON m."userId" = u.id
        AND m."deletedAt" IS NULL
        ${startDateCondition}
        ${cuisineName ? client_1.Prisma.sql `AND m.cuisine = ${cuisineName}` : client_1.Prisma.empty}
      LEFT JOIN user_settings us ON us."userId" = u.id
      WHERE u."deletedAt" IS NULL
        AND (us.id IS NULL OR us."hideRanking" = false)
      GROUP BY u.id, u.username, u."avatarUrl"
      HAVING COUNT(m.id) > 0
      ORDER BY "mealCount" DESC, "firstMealAt" ASC
      LIMIT 100
    `;
        return {
            cuisineName,
            period,
            masters: rankings.map((r, index) => ({
                rank: index + 1,
                userId: r.userId,
                username: r.username,
                avatarUrl: r.avatarUrl,
                cuisineName: r.cuisineName,
                mealCount: Number(r.mealCount),
                firstMealAt: r.firstMealAt.toISOString(),
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
exports.CuisineMastersQuery = CuisineMastersQuery;
exports.CuisineMastersQuery = CuisineMastersQuery = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CuisineMastersQuery);
//# sourceMappingURL=cuisine-masters.query.js.map
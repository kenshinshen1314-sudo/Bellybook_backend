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
        const { startDate, startDateCondition } = this.getDateRangeSql(period);
        const experts = await this.prisma.$queryRaw `
      SELECT
        u.id as "userId",
        u.username,
        u."avatarUrl",
        COUNT(du."dishName") as "dishCount",
        SUM(du."mealCount") as "totalMeals",
        ARRAY_AGG(du."dishName" ORDER BY du."mealCount" DESC) as "dishes"
      FROM users u
      INNER JOIN dish_unlocks du ON du."userId" = u.id
        ${startDateCondition}
      LEFT JOIN user_settings us ON us."userId" = u.id
      WHERE u."deletedAt" IS NULL
        AND (us.id IS NULL OR us."hideRanking" = false)
      GROUP BY u.id, u.username, u."avatarUrl"
      HAVING COUNT(du."dishName") > 0
      ORDER BY "dishCount" DESC
      LIMIT 100
    `;
        return {
            period,
            experts: experts.map((e, index) => ({
                rank: index + 1,
                userId: e.userId,
                username: e.username,
                avatarUrl: e.avatarUrl,
                dishCount: Number(e.dishCount),
                mealCount: Number(e.totalMeals),
                dishes: (e.dishes || []).slice(0, 10),
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
            ? client_1.Prisma.sql `AND du."firstMealAt" >= ${startDate}`
            : client_1.Prisma.empty;
        return { startDate, startDateCondition };
    }
};
exports.DishExpertsQuery = DishExpertsQuery;
exports.DishExpertsQuery = DishExpertsQuery = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DishExpertsQuery);
//# sourceMappingURL=dish-experts.query.js.map
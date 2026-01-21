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
exports.StatsQuery = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../database/prisma.service");
const client_1 = require("@prisma/client");
let StatsQuery = class StatsQuery {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async execute(period) {
        const { startDate } = this.getDateRange(period);
        const [totalUsers, totalMeals, uniqueCuisines] = await Promise.all([
            this.prisma.user.count({
                where: {
                    deletedAt: null,
                    OR: [
                        { user_settings: { is: null } },
                        { user_settings: { hideRanking: false } },
                    ],
                },
            }),
            this.prisma.meal.count({
                where: {
                    deletedAt: null,
                    ...(startDate && { createdAt: { gte: startDate } }),
                },
            }),
            this.prisma.meal.findMany({
                where: {
                    deletedAt: null,
                    ...(startDate && { createdAt: { gte: startDate } }),
                },
                select: { cuisine: true },
                distinct: ['cuisine'],
            }),
        ]);
        const activeUsers = await this.prisma.$queryRaw `
      SELECT COUNT(DISTINCT "userId") as count
      FROM "meals"
      WHERE "deletedAt" IS NULL
        ${startDate ? client_1.Prisma.sql `AND "createdAt" >= ${startDate}` : client_1.Prisma.empty}
    `;
        const avgMealsPerUser = totalUsers > 0 ? totalMeals / totalUsers : 0;
        return {
            period,
            totalUsers,
            activeUsers: Number(activeUsers[0]?.count || 0),
            totalMeals,
            totalCuisines: uniqueCuisines.length,
            avgMealsPerUser: Math.round(avgMealsPerUser * 100) / 100,
        };
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
exports.StatsQuery = StatsQuery;
exports.StatsQuery = StatsQuery = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StatsQuery);
//# sourceMappingURL=stats.query.js.map
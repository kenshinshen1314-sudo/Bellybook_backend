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
        const { startDate } = this.getDateRange(period);
        const [mealAggregates, userMap] = await Promise.all([
            this.prisma.meal.groupBy({
                by: ['userId', 'cuisine'],
                where: this.buildMealWhere(startDate, cuisineName),
                _count: { id: true },
                _min: { createdAt: true },
            }),
            this.getUserMap(),
        ]);
        const rankings = [];
        for (const aggregate of mealAggregates) {
            const user = userMap.get(aggregate.userId);
            if (!user)
                continue;
            if (cuisineName) {
                if (aggregate.cuisine === cuisineName) {
                    rankings.push({
                        userId: aggregate.userId,
                        cuisineName: aggregate.cuisine,
                        mealCount: aggregate._count.id,
                        firstMealAt: aggregate._min.createdAt,
                    });
                }
            }
            else {
                rankings.push({
                    userId: aggregate.userId,
                    cuisineName: '全部菜系',
                    mealCount: aggregate._count.id,
                    firstMealAt: aggregate._min.createdAt,
                });
            }
        }
        rankings.sort((a, b) => {
            if (b.mealCount !== a.mealCount) {
                return b.mealCount - a.mealCount;
            }
            return a.firstMealAt.getTime() - b.firstMealAt.getTime();
        });
        const masters = rankings.slice(0, 100).map((r, index) => {
            const user = userMap.get(r.userId);
            return {
                rank: index + 1,
                userId: r.userId,
                username: user.username,
                avatarUrl: user.avatarUrl,
                cuisineName: r.cuisineName,
                mealCount: r.mealCount,
                firstMealAt: r.firstMealAt.toISOString(),
            };
        });
        return {
            cuisineName,
            period,
            masters,
        };
    }
    buildMealWhere(startDate, cuisineName) {
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
        if (cuisineName) {
            where.cuisine = cuisineName;
        }
        return where;
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
exports.CuisineMastersQuery = CuisineMastersQuery;
exports.CuisineMastersQuery = CuisineMastersQuery = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CuisineMastersQuery);
//# sourceMappingURL=cuisine-masters.query.js.map
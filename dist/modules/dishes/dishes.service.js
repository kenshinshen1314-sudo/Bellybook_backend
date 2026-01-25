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
var DishesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DishesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const cache_service_1 = require("../cache/cache.service");
const cache_stats_service_1 = require("../cache/cache-stats.service");
const cache_decorator_1 = require("../cache/cache.decorator");
const cache_constants_1 = require("../cache/cache.constants");
let DishesService = DishesService_1 = class DishesService {
    prisma;
    cacheService;
    cacheStatsService;
    logger = new common_1.Logger(DishesService_1.name);
    constructor(prisma, cacheService, cacheStatsService) {
        this.prisma = prisma;
        this.cacheService = cacheService;
        this.cacheStatsService = cacheStatsService;
    }
    async findOrCreateAndUpdate(input) {
        return this.prisma.runTransaction(async (tx) => {
            return this.findOrCreateAndUpdateInTx(tx, input);
        });
    }
    async getPopularDishes(limit = 10, cuisine) {
        return this.prisma.dish.findMany({
            where: cuisine ? { cuisine } : undefined,
            orderBy: { appearanceCount: 'desc' },
            take: limit,
        });
    }
    async getDishByName(name) {
        return this.prisma.dish.findUnique({
            where: { name },
        });
    }
    async findOrCreateAndUpdateInTx(tx, input) {
        const { foodName, cuisine, price, nutrition, description, historicalOrigins } = input;
        let dish = await tx.dish.findUnique({
            where: { name: foodName },
        });
        if (dish) {
            const newCount = dish.appearanceCount + 1;
            const oldWeight = dish.appearanceCount;
            const newWeight = 1;
            dish = await tx.dish.update({
                where: { id: dish.id },
                data: {
                    appearanceCount: newCount,
                    averagePrice: this.updateWeightedAverage(dish.averagePrice, price, oldWeight, newWeight),
                    averageCalories: this.updateWeightedAverage(dish.averageCalories, nutrition.calories, oldWeight, newWeight),
                    averageProtein: this.updateWeightedAverage(dish.averageProtein, nutrition.protein, oldWeight, newWeight),
                    averageFat: this.updateWeightedAverage(dish.averageFat, nutrition.fat, oldWeight, newWeight),
                    averageCarbs: this.updateWeightedAverage(dish.averageCarbs, nutrition.carbohydrates, oldWeight, newWeight),
                    description: description || dish.description,
                    historicalOrigins: historicalOrigins || dish.historicalOrigins,
                },
            });
            this.logger.debug(`Updated dish statistics: ${foodName} (count: ${newCount})`);
        }
        else {
            dish = await tx.dish.create({
                data: {
                    name: foodName,
                    cuisine,
                    description,
                    historicalOrigins,
                    appearanceCount: 1,
                    averagePrice: price,
                    averageCalories: nutrition.calories,
                    averageProtein: nutrition.protein,
                    averageFat: nutrition.fat,
                    averageCarbs: nutrition.carbohydrates,
                },
            });
            this.logger.debug(`Created new dish: ${foodName} (${cuisine})`);
        }
        return dish;
    }
    updateWeightedAverage(oldAverage, newValue, oldWeight, newWeight) {
        if (newValue === undefined || newValue === null) {
            return oldAverage;
        }
        if (oldAverage === null || oldAverage === undefined) {
            return newValue;
        }
        return (oldAverage * oldWeight + newValue * newWeight) / (oldWeight + newWeight);
    }
};
exports.DishesService = DishesService;
__decorate([
    (0, cache_decorator_1.Cacheable)(cache_constants_1.CachePrefix.DISH_INFO, ['limit', 'cuisine'], cache_constants_1.CacheTTL.LONG),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], DishesService.prototype, "getPopularDishes", null);
__decorate([
    (0, cache_decorator_1.Cacheable)(cache_constants_1.CachePrefix.DISH_INFO, ['name'], cache_constants_1.CacheTTL.LONG),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DishesService.prototype, "getDishByName", null);
exports.DishesService = DishesService = DishesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService,
        cache_stats_service_1.CacheStatsService])
], DishesService);
//# sourceMappingURL=dishes.service.js.map
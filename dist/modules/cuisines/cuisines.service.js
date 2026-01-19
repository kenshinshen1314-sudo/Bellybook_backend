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
exports.CuisinesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let CuisinesService = class CuisinesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        const cuisines = await this.prisma.cuisine_configs.findMany({
            orderBy: { displayOrder: 'asc' },
        });
        return cuisines.map(c => this.mapToCuisineConfig(c));
    }
    async findUnlocked(userId) {
        const unlocks = await this.prisma.cuisine_unlocks.findMany({
            where: { userId },
            orderBy: { mealCount: 'desc' },
        });
        return unlocks.map(u => this.mapToCuisineUnlock(u));
    }
    async getStats(userId) {
        const [totalUnlocked, totalAvailable, topCuisines, recentUnlocks] = await Promise.all([
            this.prisma.cuisine_unlocks.count({ where: { userId } }),
            this.prisma.cuisine_configs.count(),
            this.prisma.cuisine_unlocks.findMany({
                where: { userId },
                orderBy: { mealCount: 'desc' },
                take: 5,
            }),
            this.prisma.cuisine_unlocks.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
        ]);
        return {
            totalUnlocked,
            totalAvailable,
            unlockProgress: totalAvailable > 0 ? totalUnlocked / totalAvailable : 0,
            topCuisines: topCuisines.map(c => ({
                name: c.cuisineName,
                count: c.mealCount,
            })),
            recentUnlocks: recentUnlocks.map(c => ({
                name: c.cuisineName,
                unlockedAt: c.firstMealAt,
            })),
        };
    }
    async findOne(userId, name) {
        const unlock = await this.prisma.cuisine_unlocks.findUnique({
            where: {
                userId_cuisineName: { userId, cuisineName: name },
            },
        });
        if (!unlock) {
            throw new common_1.NotFoundException('Cuisine not found');
        }
        const meals = await this.prisma.meal.findMany({
            where: {
                userId,
                cuisine: name,
                deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });
        const nutritionData = meals.map(m => ({
            calories: m.calories || 0,
            protein: m.protein || 0,
            fat: m.fat || 0,
            carbohydrates: m.carbohydrates || 0,
        }));
        const avgCalories = this.average(nutritionData.map(n => n.calories));
        const avgProtein = this.average(nutritionData.map(n => n.protein));
        const avgFat = this.average(nutritionData.map(n => n.fat));
        const avgCarbs = this.average(nutritionData.map(n => n.carbohydrates));
        return {
            name: unlock.cuisineName,
            icon: unlock.cuisineIcon || undefined,
            color: unlock.cuisineColor || undefined,
            mealCount: unlock.mealCount,
            firstMealAt: unlock.firstMealAt,
            lastMealAt: unlock.lastMealAt || undefined,
            nutritionSummary: {
                avgCalories,
                avgProtein,
                avgFat,
                avgCarbs,
            },
        };
    }
    mapToCuisineConfig(cuisine) {
        return {
            name: cuisine.name,
            nameEn: cuisine.nameEn,
            nameZh: cuisine.nameZh,
            category: cuisine.category,
            icon: cuisine.icon,
            color: cuisine.color,
            description: cuisine.description,
            displayOrder: cuisine.displayOrder,
        };
    }
    mapToCuisineUnlock(unlock) {
        return {
            cuisineName: unlock.cuisineName,
            icon: unlock.cuisineIcon,
            color: unlock.cuisineColor,
            firstMealAt: unlock.firstMealAt,
            mealCount: unlock.mealCount,
            lastMealAt: unlock.lastMealAt,
        };
    }
    average(numbers) {
        if (numbers.length === 0)
            return 0;
        return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    }
};
exports.CuisinesService = CuisinesService;
exports.CuisinesService = CuisinesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CuisinesService);
//# sourceMappingURL=cuisines.service.js.map
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
var MealsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MealsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const dishes_service_1 = require("../dishes/dishes.service");
const date_util_1 = require("../../common/utils/date.util");
let MealsService = MealsService_1 = class MealsService {
    prisma;
    dishesService;
    logger = new common_1.Logger(MealsService_1.name);
    constructor(prisma, dishesService) {
        this.prisma = prisma;
        this.dishesService = dishesService;
    }
    async create(userId, dto) {
        const firstDish = this.extractFirstDish(dto.analysis);
        const result = await this.prisma.runTransaction(async (tx) => {
            const dish = await this.dishesService.findOrCreateAndUpdateInTx(tx, {
                foodName: firstDish.foodName,
                cuisine: firstDish.cuisine,
                nutrition: {
                    calories: dto.analysis.nutrition.calories,
                    protein: dto.analysis.nutrition.protein,
                    fat: dto.analysis.nutrition.fat,
                    carbohydrates: dto.analysis.nutrition.carbohydrates,
                },
                price: dto.analysis.foodPrice,
                description: dto.analysis.description,
                historicalOrigins: dto.analysis.historicalOrigins,
            });
            const meal = await tx.meal.create({
                data: {
                    userId,
                    imageUrl: dto.imageUrl,
                    thumbnailUrl: dto.thumbnailUrl,
                    analysis: this.toPrismaJson(dto.analysis),
                    foodName: firstDish.foodName,
                    cuisine: firstDish.cuisine,
                    mealType: dto.mealType || 'SNACK',
                    notes: dto.notes,
                    calories: dto.analysis.nutrition.calories,
                    protein: dto.analysis.nutrition.protein,
                    fat: dto.analysis.nutrition.fat,
                    carbohydrates: dto.analysis.nutrition.carbohydrates,
                    price: dto.analysis.foodPrice,
                    dishId: dish.id,
                    searchText: this.buildSearchText(firstDish.foodName, firstDish.cuisine, dto.notes),
                    analyzedAt: new Date(),
                },
            });
            await Promise.all([
                this.updateCuisineUnlockInTx(tx, userId, firstDish.cuisine),
                this.updateDailyNutritionInTx(tx, userId, meal),
                this.updateDishUnlockInTx(tx, userId, firstDish.foodName),
            ]);
            return { meal, dish };
        }, {
            maxWait: 5000,
            timeout: 10000,
        });
        this.logger.log(`Meal created: ${result.meal.id} for user: ${userId}`);
        return this.mapToMealResponse(result.meal);
    }
    async createPending(userId, dto) {
        const meal = await this.prisma.meal.create({
            data: {
                userId,
                imageUrl: dto.imageUrl,
                thumbnailUrl: dto.thumbnailUrl,
                analysis: this.toPrismaJson({
                    status: 'analyzing',
                    message: 'AI analysis is in progress...',
                }),
                foodName: '分析中...',
                cuisine: '待定',
                mealType: dto.mealType || 'SNACK',
                searchText: 'analyzing pending',
            },
        });
        return this.mapToMealResponse(meal);
    }
    async updateWithAnalysis(mealId, data) {
        const result = await this.prisma.runTransaction(async (tx) => {
            const meal = await tx.meal.findUnique({
                where: { id: mealId },
            });
            if (!meal) {
                throw new common_1.NotFoundException('Meal not found');
            }
            const dish = await this.dishesService.findOrCreateAndUpdateInTx(tx, {
                foodName: data.foodName,
                cuisine: data.cuisine,
                nutrition: {
                    calories: data.calories,
                    protein: data.protein,
                    fat: data.fat,
                    carbohydrates: data.carbohydrates,
                },
                price: data.price,
                description: data.description,
                historicalOrigins: data.historicalOrigins,
            });
            const updatedMeal = await tx.meal.update({
                where: { id: mealId },
                data: {
                    analysis: this.toPrismaJson(data.analysis),
                    foodName: data.foodName,
                    cuisine: data.cuisine,
                    calories: data.calories,
                    protein: data.protein,
                    fat: data.fat,
                    carbohydrates: data.carbohydrates,
                    price: data.price,
                    dishId: dish.id,
                    searchText: this.buildSearchText(data.foodName, data.cuisine),
                    analyzedAt: new Date(),
                },
            });
            await Promise.all([
                this.updateCuisineUnlockInTx(tx, meal.userId, data.cuisine),
                this.updateDailyNutritionInTx(tx, meal.userId, updatedMeal),
                this.updateDishUnlockInTx(tx, meal.userId, data.foodName),
            ]);
            return updatedMeal;
        });
        this.logger.log(`Meal updated with analysis: ${mealId}`);
        return this.mapToMealResponse(result);
    }
    async markAnalysisFailed(mealId, errorData) {
        const updatedMeal = await this.prisma.meal.update({
            where: { id: mealId },
            data: {
                analysis: this.toPrismaJson({
                    status: errorData.status,
                    error: errorData.error,
                    message: 'AI analysis failed. Please try again.',
                }),
                foodName: '分析失败',
                cuisine: '未知',
            },
        });
        return this.mapToMealResponse(updatedMeal);
    }
    async findAll(userId, query) {
        const { page = 1, limit = 20, offset, mealType, startDate, endDate, cuisine, sortBy, sortOrder } = query;
        const skip = offset ?? (page - 1) * limit;
        const where = this.buildWhereClause(userId, { mealType, startDate, endDate, cuisine });
        const orderBy = this.buildOrderByClause(sortBy, sortOrder);
        const [meals, total] = await Promise.all([
            this.prisma.meal.findMany({ where, orderBy, skip, take: limit }),
            this.prisma.meal.count({ where }),
        ]);
        return new pagination_dto_1.PaginatedResponse(meals.map((m) => this.mapToMealResponse(m)), total, page, limit);
    }
    async findOne(userId, id) {
        const meal = await this.prisma.meal.findFirst({
            where: { id, userId, deletedAt: null },
        });
        if (!meal) {
            throw new common_1.NotFoundException('Meal not found');
        }
        return this.mapToMealResponse(meal);
    }
    async update(userId, id, dto) {
        const meal = await this.prisma.meal.findFirst({
            where: { id, userId, deletedAt: null },
        });
        if (!meal) {
            throw new common_1.NotFoundException('Meal not found');
        }
        const updatedMeal = await this.prisma.meal.update({
            where: { id },
            data: {
                ...dto,
                version: { increment: 1 },
            },
        });
        return this.mapToMealResponse(updatedMeal);
    }
    async remove(userId, id) {
        const meal = await this.prisma.meal.findFirst({
            where: { id, userId, deletedAt: null },
        });
        if (!meal) {
            throw new common_1.NotFoundException('Meal not found');
        }
        await this.prisma.meal.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        this.logger.log(`Meal deleted: ${id} by user: ${userId}`);
    }
    async getToday(userId) {
        const [today, tomorrow] = date_util_1.DateUtil.dayRange();
        const meals = await this.prisma.meal.findMany({
            where: {
                userId,
                createdAt: { gte: today, lt: tomorrow },
                deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
        });
        return meals.map((m) => this.mapToMealResponse(m));
    }
    async getByDate(userId, date) {
        const [startOfDay, endOfDay] = date_util_1.DateUtil.dayRange(date);
        const meals = await this.prisma.meal.findMany({
            where: {
                userId,
                createdAt: { gte: startOfDay, lt: endOfDay },
                deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
        });
        return meals.map((m) => this.mapToMealResponse(m));
    }
    async getByDishName(userId, foodName) {
        const [meals, dish] = await Promise.all([
            this.prisma.meal.findMany({
                where: { userId, foodName, deletedAt: null },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.dish.findUnique({ where: { name: foodName } }),
        ]);
        return {
            meals: meals.map((m) => this.mapToMealResponse(m)),
            dish: dish
                ? {
                    name: dish.name,
                    cuisine: dish.cuisine,
                    appearanceCount: dish.appearanceCount,
                    averageCalories: dish.averageCalories,
                    averageProtein: dish.averageProtein,
                    averageFat: dish.averageFat,
                    averageCarbs: dish.averageCarbs,
                    description: dish.description,
                    historicalOrigins: dish.historicalOrigins,
                }
                : null,
        };
    }
    async updateCuisineUnlockInTx(tx, userId, cuisineName) {
        const existing = await tx.cuisine_unlocks.findUnique({
            where: { userId_cuisineName: { userId, cuisineName } },
        });
        if (existing) {
            await tx.cuisine_unlocks.update({
                where: { id: existing.id },
                data: { mealCount: { increment: 1 }, lastMealAt: new Date() },
            });
        }
        else {
            const config = await tx.cuisine_configs.findUnique({
                where: { name: cuisineName },
            });
            await tx.cuisine_unlocks.create({
                data: {
                    userId,
                    cuisineName,
                    firstMealAt: new Date(),
                    mealCount: 1,
                    lastMealAt: new Date(),
                    cuisineIcon: config?.icon,
                    cuisineColor: config?.color,
                },
            });
        }
    }
    async updateDailyNutritionInTx(tx, userId, meal) {
        const mealDate = date_util_1.DateUtil.startOfDay(meal.createdAt);
        const analysis = meal.analysis;
        const nutrition = analysis?.nutrition || {
            calories: meal.calories || 0,
            protein: meal.protein || 0,
            fat: meal.fat || 0,
            carbohydrates: meal.carbohydrates || 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
        };
        const existing = await tx.daily_nutritions.findUnique({
            where: { userId_date: { userId, date: mealDate } },
        });
        const incrementData = {
            totalCalories: nutrition.calories || 0,
            totalProtein: nutrition.protein || 0,
            totalFat: nutrition.fat || 0,
            totalCarbohydrates: nutrition.carbohydrates || 0,
            totalFiber: nutrition.fiber || 0,
            totalSugar: nutrition.sugar || 0,
            totalSodium: nutrition.sodium || 0,
            mealCount: 1,
            breakfastCount: meal.mealType === 'BREAKFAST' ? 1 : 0,
            lunchCount: meal.mealType === 'LUNCH' ? 1 : 0,
            dinnerCount: meal.mealType === 'DINNER' ? 1 : 0,
            snackCount: meal.mealType === 'SNACK' ? 1 : 0,
        };
        if (existing) {
            await tx.daily_nutritions.update({
                where: { id: existing.id },
                data: incrementData,
            });
        }
        else {
            await tx.daily_nutritions.create({
                data: {
                    userId,
                    date: mealDate,
                    ...incrementData,
                },
            });
        }
    }
    async updateDishUnlockInTx(tx, userId, dishName) {
        const existing = await tx.dish_unlocks.findUnique({
            where: { userId_dishName: { userId, dishName } },
        });
        if (existing) {
            await tx.dish_unlocks.update({
                where: { id: existing.id },
                data: { mealCount: { increment: 1 }, lastMealAt: new Date() },
            });
        }
        else {
            await tx.dish_unlocks.create({
                data: {
                    userId,
                    dishName,
                    firstMealAt: new Date(),
                    mealCount: 1,
                    lastMealAt: new Date(),
                },
            });
        }
    }
    extractFirstDish(analysis) {
        const firstDish = analysis.dishes?.[0];
        if (!firstDish) {
            throw new Error('Invalid AI response: no dishes found');
        }
        return firstDish;
    }
    toPrismaJson(value) {
        try {
            return JSON.parse(JSON.stringify(value));
        }
        catch (error) {
            this.logger.error('Failed to convert to Prisma.InputJsonValue', error);
            return {};
        }
    }
    buildSearchText(foodName, cuisine, notes) {
        return `${foodName} ${cuisine} ${notes || ''}`.toLowerCase().trim();
    }
    buildWhereClause(userId, filters) {
        const where = {
            userId,
            deletedAt: null,
        };
        if (filters.mealType) {
            where.mealType =
                filters.mealType;
        }
        if (filters.startDate || filters.endDate) {
            where.createdAt = {};
            if (filters.startDate)
                where.createdAt.gte = new Date(filters.startDate);
            if (filters.endDate)
                where.createdAt.lte = new Date(filters.endDate);
        }
        if (filters.cuisine) {
            where.cuisine = filters.cuisine;
        }
        return where;
    }
    buildOrderByClause(sortBy, sortOrder) {
        if (sortBy) {
            return { [sortBy]: sortOrder || 'desc' };
        }
        return { createdAt: 'desc' };
    }
    mapToMealResponse(meal) {
        return {
            id: meal.id,
            userId: meal.userId,
            imageUrl: meal.imageUrl,
            thumbnailUrl: meal.thumbnailUrl ?? undefined,
            analysis: meal.analysis,
            mealType: meal.mealType,
            notes: meal.notes ?? undefined,
            createdAt: meal.createdAt,
            updatedAt: meal.updatedAt,
            isSynced: meal.isSynced,
            version: meal.version,
        };
    }
};
exports.MealsService = MealsService;
exports.MealsService = MealsService = MealsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        dishes_service_1.DishesService])
], MealsService);
//# sourceMappingURL=meals.service.js.map
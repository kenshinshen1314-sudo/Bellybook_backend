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
exports.MealsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const dishes_service_1 = require("../dishes/dishes.service");
let MealsService = class MealsService {
    prisma;
    dishesService;
    constructor(prisma, dishesService) {
        this.prisma = prisma;
        this.dishesService = dishesService;
    }
    async create(userId, dto) {
        const foodName = dto.analysis.foodName;
        const cuisine = dto.analysis.cuisine;
        const calories = dto.analysis.nutrition.calories;
        const protein = dto.analysis.nutrition.protein;
        const fat = dto.analysis.nutrition.fat;
        const carbohydrates = dto.analysis.nutrition.carbohydrates;
        const price = dto.analysis.foodPrice;
        const description = dto.analysis.description;
        const historicalOrigins = dto.analysis.historicalOrigins;
        const dish = await this.dishesService.findOrCreateAndUpdate(foodName, cuisine, price, calories, protein, fat, carbohydrates, description, historicalOrigins);
        const meal = await this.prisma.meal.create({
            data: {
                userId,
                imageUrl: dto.imageUrl,
                thumbnailUrl: dto.thumbnailUrl,
                analysis: dto.analysis,
                foodName,
                cuisine,
                mealType: dto.mealType || 'SNACK',
                notes: dto.notes,
                calories,
                protein,
                fat,
                carbohydrates,
                price,
                dishId: dish.id,
                searchText: `${foodName} ${cuisine} ${dto.notes || ''}`.toLowerCase(),
                analyzedAt: new Date(),
            },
        });
        try {
            await this.updateCuisineUnlock(userId, cuisine);
        }
        catch (error) {
            console.error(`Failed to update cuisine unlock: ${error.message}`);
        }
        try {
            await this.updateDailyNutrition(userId, meal);
        }
        catch (error) {
            console.error(`Failed to update daily nutrition: ${error.message}`);
        }
        try {
            await this.updateDishUnlock(userId, foodName);
        }
        catch (error) {
            console.error(`Failed to update dish unlock: ${error.message}`);
        }
        return this.mapToMealResponse(meal);
    }
    async createPending(userId, dto) {
        const meal = await this.prisma.meal.create({
            data: {
                userId,
                imageUrl: dto.imageUrl,
                thumbnailUrl: dto.thumbnailUrl,
                analysis: {
                    status: 'analyzing',
                    message: 'AI analysis is in progress...',
                },
                foodName: '分析中...',
                cuisine: '待定',
                mealType: dto.mealType || 'SNACK',
                searchText: 'analyzing pending',
            },
        });
        return this.mapToMealResponse(meal);
    }
    async updateWithAnalysis(mealId, data) {
        const meal = await this.prisma.meal.findUnique({
            where: { id: mealId },
        });
        if (!meal) {
            throw new common_1.NotFoundException('Meal not found');
        }
        const dish = await this.dishesService.findOrCreateAndUpdate(data.foodName, data.cuisine, data.price, data.calories, data.protein, data.fat, data.carbohydrates, data.description, data.historicalOrigins);
        const updatedMeal = await this.prisma.meal.update({
            where: { id: mealId },
            data: {
                analysis: data.analysis,
                foodName: data.foodName,
                cuisine: data.cuisine,
                calories: data.calories,
                protein: data.protein,
                fat: data.fat,
                carbohydrates: data.carbohydrates,
                price: data.price,
                dishId: dish.id,
                searchText: `${data.foodName} ${data.cuisine}`.toLowerCase(),
                analyzedAt: new Date(),
            },
        });
        try {
            await this.updateCuisineUnlock(meal.userId, data.cuisine);
        }
        catch (error) {
            console.error(`Failed to update cuisine unlock: ${error.message}`);
        }
        try {
            await this.updateDailyNutrition(meal.userId, updatedMeal);
        }
        catch (error) {
            console.error(`Failed to update daily nutrition: ${error.message}`);
        }
        try {
            await this.updateDishUnlock(meal.userId, data.foodName);
        }
        catch (error) {
            console.error(`Failed to update dish unlock: ${error.message}`);
        }
        return this.mapToMealResponse(updatedMeal);
    }
    async markAnalysisFailed(mealId, errorData) {
        const updatedMeal = await this.prisma.meal.update({
            where: { id: mealId },
            data: {
                analysis: {
                    status: errorData.status,
                    error: errorData.error,
                    message: 'AI analysis failed. Please try again.',
                },
                foodName: '分析失败',
                cuisine: '未知',
            },
        });
        return this.mapToMealResponse(updatedMeal);
    }
    async findAll(userId, query) {
        const { page = 1, limit = 20, offset, mealType, startDate, endDate, cuisine, sortBy, sortOrder } = query;
        const skip = offset ?? (page - 1) * limit;
        const where = {
            userId,
            deletedAt: null,
        };
        if (mealType) {
            where.mealType = mealType;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = new Date(startDate);
            if (endDate)
                where.createdAt.lte = new Date(endDate);
        }
        if (cuisine) {
            where.cuisine = cuisine;
        }
        const orderBy = {};
        if (sortBy) {
            orderBy[sortBy] = sortOrder || 'desc';
        }
        else {
            orderBy.createdAt = 'desc';
        }
        const [meals, total] = await Promise.all([
            this.prisma.meal.findMany({
                where,
                orderBy,
                skip,
                take: limit,
            }),
            this.prisma.meal.count({ where }),
        ]);
        return new pagination_dto_1.PaginatedResponse(meals.map(m => this.mapToMealResponse(m)), total, page, limit);
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
    }
    async getToday(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const meals = await this.prisma.meal.findMany({
            where: {
                userId,
                createdAt: { gte: today, lt: tomorrow },
                deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
        });
        return meals.map(m => this.mapToMealResponse(m));
    }
    async getByDate(userId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);
        const meals = await this.prisma.meal.findMany({
            where: {
                userId,
                createdAt: { gte: startOfDay, lt: endOfDay },
                deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
        });
        return meals.map(m => this.mapToMealResponse(m));
    }
    async getByDishName(userId, foodName) {
        const meals = await this.prisma.meal.findMany({
            where: {
                userId,
                foodName,
                deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
        });
        const dish = await this.prisma.dish.findUnique({
            where: { name: foodName },
        });
        return {
            meals: meals.map(m => this.mapToMealResponse(m)),
            dish: dish ? {
                name: dish.name,
                cuisine: dish.cuisine,
                appearanceCount: dish.appearanceCount,
                averageCalories: dish.averageCalories,
                averageProtein: dish.averageProtein,
                averageFat: dish.averageFat,
                averageCarbs: dish.averageCarbs,
                description: dish.description,
                historicalOrigins: dish.historicalOrigins,
            } : null,
        };
    }
    async updateCuisineUnlock(userId, cuisineName) {
        const existing = await this.prisma.cuisine_unlocks.findUnique({
            where: {
                userId_cuisineName: { userId, cuisineName },
            },
        });
        if (existing) {
            await this.prisma.cuisine_unlocks.update({
                where: { id: existing.id },
                data: {
                    mealCount: { increment: 1 },
                    lastMealAt: new Date(),
                },
            });
        }
        else {
            const config = await this.prisma.cuisine_configs.findUnique({
                where: { name: cuisineName },
            });
            await this.prisma.cuisine_unlocks.create({
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
    async updateDailyNutrition(userId, meal) {
        const mealDate = new Date(meal.createdAt);
        mealDate.setHours(0, 0, 0, 0);
        const daily = await this.prisma.daily_nutritions.findUnique({
            where: {
                userId_date: { userId, date: mealDate },
            },
        });
        const nutrition = meal.analysis?.nutrition || {};
        if (daily) {
            await this.prisma.daily_nutritions.update({
                where: { id: daily.id },
                data: {
                    totalCalories: { increment: nutrition.calories || 0 },
                    totalProtein: { increment: nutrition.protein || 0 },
                    totalFat: { increment: nutrition.fat || 0 },
                    totalCarbohydrates: { increment: nutrition.carbohydrates || 0 },
                    totalFiber: { increment: nutrition.fiber || 0 },
                    totalSugar: { increment: nutrition.sugar || 0 },
                    totalSodium: { increment: nutrition.sodium || 0 },
                    mealCount: { increment: 1 },
                    breakfastCount: meal.mealType === 'BREAKFAST' ? { increment: 1 } : undefined,
                    lunchCount: meal.mealType === 'LUNCH' ? { increment: 1 } : undefined,
                    dinnerCount: meal.mealType === 'DINNER' ? { increment: 1 } : undefined,
                    snackCount: meal.mealType === 'SNACK' ? { increment: 1 } : undefined,
                },
            });
        }
        else {
            await this.prisma.daily_nutritions.create({
                data: {
                    userId,
                    date: mealDate,
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
                },
            });
        }
    }
    async updateDishUnlock(userId, dishName) {
        const existing = await this.prisma.dish_unlocks.findUnique({
            where: {
                userId_dishName: { userId, dishName },
            },
        });
        if (existing) {
            await this.prisma.dish_unlocks.update({
                where: { id: existing.id },
                data: {
                    mealCount: { increment: 1 },
                    lastMealAt: new Date(),
                },
            });
        }
        else {
            await this.prisma.dish_unlocks.create({
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
    mapToMealResponse(meal) {
        return {
            id: meal.id,
            userId: meal.userId,
            imageUrl: meal.imageUrl,
            thumbnailUrl: meal.thumbnailUrl,
            analysis: meal.analysis,
            mealType: meal.mealType,
            notes: meal.notes,
            createdAt: meal.createdAt,
            updatedAt: meal.updatedAt,
            isSynced: meal.isSynced,
            version: meal.version,
        };
    }
};
exports.MealsService = MealsService;
exports.MealsService = MealsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        dishes_service_1.DishesService])
], MealsService);
//# sourceMappingURL=meals.service.js.map
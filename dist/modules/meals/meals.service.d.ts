import { PrismaService } from '../../database/prisma.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { MealResponseDto, PaginatedMealsDto } from './dto/meal-response.dto';
import { MealQueryDto } from './dto/meal-query.dto';
import { DishesService } from '../dishes/dishes.service';
import { CacheService } from '../cache/cache.service';
import { AiAnalysis } from './meals.types';
export declare class MealsService {
    private prisma;
    private dishesService;
    cacheService: CacheService;
    private readonly logger;
    constructor(prisma: PrismaService, dishesService: DishesService, cacheService: CacheService);
    create(userId: string, dto: CreateMealDto): Promise<MealResponseDto>;
    private invalidateRelatedCaches;
    createPending(userId: string, dto: CreateMealDto): Promise<MealResponseDto>;
    updateWithAnalysis(mealId: string, data: {
        analysis: AiAnalysis;
        calories: number;
        protein: number;
        fat: number;
        carbohydrates: number;
        price?: number;
        foodName: string;
        cuisine: string;
        description?: string;
        historicalOrigins?: string;
    }): Promise<MealResponseDto>;
    markAnalysisFailed(mealId: string, errorData: {
        error: string;
        status: string;
    }): Promise<MealResponseDto>;
    findAll(userId: string, query: MealQueryDto): Promise<PaginatedMealsDto>;
    findOne(userId: string, id: string): Promise<MealResponseDto>;
    update(userId: string, id: string, dto: UpdateMealDto): Promise<MealResponseDto>;
    remove(userId: string, id: string): Promise<void>;
    getToday(userId: string): Promise<MealResponseDto[]>;
    getByDate(userId: string, date: Date): Promise<MealResponseDto[]>;
    getByDishName(userId: string, foodName: string): Promise<{
        meals: MealResponseDto[];
        dish: {
            name: string;
            cuisine: string;
            appearanceCount: number;
            averageCalories: number | null;
            averageProtein: number | null;
            averageFat: number | null;
            averageCarbs: number | null;
            description: string | null;
            historicalOrigins: string | null;
        } | null;
    }>;
    private updateCuisineUnlockInTx;
    private updateDailyNutritionInTx;
    private updateDishUnlockInTx;
    private extractFirstDish;
    private toPrismaJson;
    private buildSearchText;
    private buildWhereClause;
    private buildOrderByClause;
    private mapToMealResponse;
}

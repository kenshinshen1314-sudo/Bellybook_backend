import { PrismaService } from '../../database/prisma.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { MealResponseDto, PaginatedMealsDto } from './dto/meal-response.dto';
import { MealQueryDto } from './dto/meal-query.dto';
import { DishesService } from '../dishes/dishes.service';
export declare class MealsService {
    private prisma;
    private dishesService;
    constructor(prisma: PrismaService, dishesService: DishesService);
    create(userId: string, dto: CreateMealDto): Promise<MealResponseDto>;
    createPending(userId: string, dto: {
        imageUrl: string;
        thumbnailUrl?: string;
        mealType?: string;
    }): Promise<MealResponseDto>;
    updateWithAnalysis(mealId: string, data: {
        analysis: any;
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
    private updateCuisineUnlock;
    private updateDailyNutrition;
    private mapToMealResponse;
}

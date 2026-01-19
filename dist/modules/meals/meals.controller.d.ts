import { MealsService } from './meals.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { MealResponseDto, PaginatedMealsDto } from './dto/meal-response.dto';
import { MealQueryDto } from './dto/meal-query.dto';
import { SuccessResponse } from '../../common/dto/response.dto';
export declare class MealsController {
    private readonly mealsService;
    constructor(mealsService: MealsService);
    findAll(userId: string, query: MealQueryDto): Promise<PaginatedMealsDto>;
    getToday(userId: string): Promise<MealResponseDto[]>;
    getByDate(userId: string, dateStr: string): Promise<MealResponseDto[]>;
    getByDishName(userId: string, dishName: string): Promise<{
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
    findOne(userId: string, id: string): Promise<MealResponseDto>;
    create(userId: string, dto: CreateMealDto): Promise<MealResponseDto>;
    update(userId: string, id: string, dto: UpdateMealDto): Promise<MealResponseDto>;
    remove(userId: string, id: string): Promise<SuccessResponse>;
}

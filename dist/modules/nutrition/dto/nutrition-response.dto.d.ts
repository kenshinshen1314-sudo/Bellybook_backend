import { MealResponseDto } from '../../meals/dto/meal-response.dto';
export declare class DailyNutritionDto {
    date: string;
    totalCalories: number;
    totalProtein: number;
    totalFat: number;
    totalCarbohydrates: number;
    totalFiber: number;
    totalSugar: number;
    totalSodium: number;
    mealCount: number;
    breakfastCount: number;
    lunchCount: number;
    dinnerCount: number;
    snackCount: number;
    meals: MealResponseDto[];
}
export declare class DailyNutritionData {
    date: string;
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
}
export declare class Averages {
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
}
export declare class WeeklyTrendsDto {
    startDate: string;
    endDate: string;
    dailyData: DailyNutritionData[];
    averages: Averages;
    totalMeals: number;
}
export declare class TopCuisine {
    name: string;
    count: number;
    percentage: number;
}
export declare class TopMeal {
    foodName: string;
    cuisine: string;
    count: number;
}
export declare class NutritionSummaryDto {
    period: 'week' | 'month' | 'year' | 'all';
    startDate: string;
    endDate: string;
    totalMeals: number;
    totalCalories: number;
    averages: Averages;
    topCuisines: TopCuisine[];
    topMeals: TopMeal[];
}
export declare class AverageValues {
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
    fiber: number;
    sugar: number;
    sodium: number;
}
export declare class AverageNutritionDto {
    period: string;
    averages: AverageValues;
    totalDays: number;
}

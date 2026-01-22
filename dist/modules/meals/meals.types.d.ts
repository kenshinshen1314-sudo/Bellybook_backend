import { Meal } from '@prisma/client';
export interface AiDishInfo {
    foodName: string;
    cuisine: string;
    confidence?: number;
    ingredients?: string[];
    nutrition?: {
        calories: number;
        protein: number;
        fat: number;
        carbohydrates: number;
        fiber?: number;
        sugar?: number;
        sodium?: number;
    };
}
export interface AiAnalysis {
    status?: string;
    error?: string;
    message?: string;
    dishes?: AiDishInfo[];
    nutrition?: {
        calories: number;
        protein: number;
        fat: number;
        carbohydrates: number;
        fiber?: number;
        sugar?: number;
        sodium?: number;
    };
    foodPrice?: number;
    description?: string;
    historicalOrigins?: string;
    summary?: string;
}
export interface CreateMealInput {
    userId: string;
    imageUrl: string;
    thumbnailUrl?: string;
    analysis: AiAnalysis;
    mealType?: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
    notes?: string;
    dishId: string;
}
export interface MealCreateResult {
    meal: Meal;
    dish: {
        id: string;
        name: string;
        cuisine: string;
    };
}
export interface CuisineUnlockCreateData {
    userId: string;
    cuisineName: string;
    firstMealAt: Date;
    mealCount: number;
    lastMealAt: Date;
    cuisineIcon?: string | null;
    cuisineColor?: string | null;
}
export interface DishUnlockCreateData {
    userId: string;
    dishName: string;
    firstMealAt: Date;
    mealCount: number;
    lastMealAt: Date;
}
export interface DailyNutritionCreateData {
    userId: string;
    date: Date;
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
}
export interface MealFilters {
    mealType?: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
    startDate?: string;
    endDate?: string;
    cuisine?: string;
}
export interface ExistingUnlock {
    id: string;
    mealCount: number;
}
export interface UnlockUpdateData {
    mealCount: number;
    lastMealAt: Date;
}

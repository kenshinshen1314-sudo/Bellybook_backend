export declare class Nutrition {
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
}
export declare class Ingredient {
    name: string;
    percentage: number;
    icon?: string;
    description?: string;
}
export declare class DishInfo {
    foodName: string;
    cuisine: string;
    nutrition: Nutrition;
}
export declare class MealAnalysis {
    dishes: DishInfo[];
    nutrition: Nutrition;
    plating?: string;
    sensory?: string;
    container?: string;
    description?: string;
    ingredients?: string[];
    suggestions?: string[];
    poeticDescription?: string;
    foodNamePoetic?: string;
    foodPrice?: number;
    historicalOrigins?: string;
    nutritionCommentary?: string;
    dishSuggestion?: string;
    analyzedAt?: string;
}
export declare class CreateMealDto {
    imageUrl: string;
    thumbnailUrl?: string;
    analysis: MealAnalysis;
    mealType?: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
    notes?: string;
}

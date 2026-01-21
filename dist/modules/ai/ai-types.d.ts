export interface Nutrition {
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
}
export interface DishInfo {
    foodName: string;
    cuisine: string;
    nutrition: Nutrition;
}
export interface FoodAnalysisResult {
    dishes: DishInfo[];
    nutrition: Nutrition;
    plating?: string;
    description?: string;
    ingredients?: string[];
    historicalOrigins?: string;
    poeticDescription?: string;
    foodNamePoetic?: string;
    foodPrice?: number;
    dishSuggestion?: string;
}
export interface DishInput {
    foodName: string;
    cuisine: string;
    nutrition: {
        calories?: number;
        protein?: number;
        fat?: number;
        carbohydrates?: number;
    };
    price?: number;
    description?: string;
    historicalOrigins?: string;
}

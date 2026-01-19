export declare class CuisineConfigDto {
    name: string;
    nameEn?: string;
    nameZh?: string;
    category?: string;
    icon: string;
    color: string;
    description?: string;
    displayOrder: number;
}
export declare class CuisineUnlockDto {
    cuisineName: string;
    icon?: string;
    color?: string;
    firstMealAt: Date;
    mealCount: number;
    lastMealAt?: Date;
}
export declare class TopCuisine {
    name: string;
    count: number;
}
export declare class RecentUnlock {
    name: string;
    unlockedAt: Date;
}
export declare class CuisineStatsDto {
    totalUnlocked: number;
    totalAvailable: number;
    unlockProgress: number;
    topCuisines: TopCuisine[];
    recentUnlocks: RecentUnlock[];
}
export declare class NutritionSummary {
    avgCalories: number;
    avgProtein: number;
    avgFat: number;
    avgCarbs: number;
}
export declare class CuisineDetailDto {
    name: string;
    icon?: string;
    color?: string;
    description?: string;
    mealCount: number;
    firstMealAt: Date;
    lastMealAt?: Date;
    nutritionSummary: NutritionSummary;
}

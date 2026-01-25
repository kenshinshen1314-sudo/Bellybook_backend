export declare class CuisineMasterEntry {
    rank: number;
    userId: string;
    username: string;
    avatarUrl: string | null;
    cuisineName: string;
    mealCount: number;
    firstMealAt: string;
}
export declare class CuisineMastersDto {
    cuisineName?: string;
    period: string;
    masters: CuisineMasterEntry[];
}
export declare class LeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    avatarUrl: string | null;
    score: number;
    mealCount: number;
    cuisineCount: number;
}
export declare class LeaderboardDto {
    period: string;
    tier?: string;
    leaderboard: LeaderboardEntry[];
}
export declare class GourmetEntry {
    rank: number;
    userId: string;
    username: string;
    avatarUrl: string | null;
    cuisineCount: number;
    mealCount: number;
    cuisines: string[];
}
export declare class GourmetsDto {
    period: string;
    gourmets: GourmetEntry[];
}
export declare class RankingStatsDto {
    period: string;
    totalUsers: number;
    activeUsers: number;
    totalMeals: number;
    totalCuisines: number;
    avgMealsPerUser: number;
}
export declare class DishExpertEntry {
    rank: number;
    userId: string;
    username: string;
    avatarUrl: string | null;
    dishCount: number;
    mealCount: number;
    dishes: string[];
    cuisines: string[];
}
export declare class DishExpertsDto {
    period: string;
    experts: DishExpertEntry[];
}
export declare class CuisineExpertDishEntry {
    dishName: string;
    cuisine: string;
    mealCount: number;
    firstMealAt: string;
    lastMealAt?: string;
    imageUrl?: string;
    calories?: number;
    notes?: string;
}
export declare class CuisineExpertDetailDto {
    userId: string;
    username: string;
    avatarUrl: string | null;
    cuisineName: string;
    period: string;
    totalDishes: number;
    totalMeals: number;
    dishes: CuisineExpertDishEntry[];
    offset?: number;
    limit?: number;
    hasMore?: boolean;
}
export declare class UserCuisineStats {
    rank: number;
    userId: string;
    username: string;
    avatarUrl: string | null;
    cuisineName: string;
    dishCount: number;
    mealCount: number;
    firstMealAt: string;
}
export declare class AllUsersDishesDto {
    period: string;
    totalEntries: number;
    totalUsers: number;
    totalCuisines: number;
    entries: UserCuisineStats[];
}
export declare class UnlockedDishEntry {
    dishName: string;
    cuisine: string;
    mealCount: number;
    firstMealAt: string;
    lastMealAt: string;
    imageUrl?: string;
    calories?: number;
}
export declare class UserUnlockedDishesDto {
    userId: string;
    username: string;
    avatarUrl: string | null;
    totalDishes: number;
    totalMeals: number;
    dishes: UnlockedDishEntry[];
    offset?: number;
    limit?: number;
    hasMore?: boolean;
}

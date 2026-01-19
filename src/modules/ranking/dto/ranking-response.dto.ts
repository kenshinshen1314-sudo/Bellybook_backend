export interface CuisineMasterEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  cuisineName: string;
  mealCount: number;
  firstMealAt: string;
}

export interface CuisineMastersDto {
  cuisineName?: string;
  period: string;
  masters: CuisineMasterEntry[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  score: number;
  mealCount: number;
  cuisineCount: number;
}

export interface LeaderboardDto {
  period: string;
  tier?: string;
  leaderboard: LeaderboardEntry[];
}

export interface GourmetEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  cuisineCount: number;
  mealCount: number;
  cuisines: string[];
}

export interface GourmetsDto {
  period: string;
  gourmets: GourmetEntry[];
}

export interface RankingStatsDto {
  period: string;
  totalUsers: number;
  activeUsers: number;
  totalMeals: number;
  totalCuisines: number;
  avgMealsPerUser: number;
}

export interface DishExpertEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  dishCount: number;
  mealCount: number;
  dishes: string[];
}

export interface DishExpertsDto {
  period: string;
  experts: DishExpertEntry[];
}

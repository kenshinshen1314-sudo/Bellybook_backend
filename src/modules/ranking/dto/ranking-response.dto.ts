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
  cuisines: string[];
}

export interface DishExpertsDto {
  period: string;
  experts: DishExpertEntry[];
}

export interface CuisineExpertDishEntry {
  dishName: string;
  cuisine: string;
  mealCount: number;
  firstMealAt: string;
  lastMealAt?: string;
  imageUrl?: string;
  calories?: number;
  notes?: string;
}

export interface CuisineExpertDetailDto {
  userId: string;
  username: string;
  avatarUrl: string | null;
  cuisineName: string;
  period: string;
  totalDishes: number;
  totalMeals: number;
  dishes: CuisineExpertDishEntry[];
}

/**
 * 用户+菜系统计数据
 * 用于展示每个用户在各个菜系下的菜品数量
 */
export interface UserCuisineStats {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  cuisineName: string;
  dishCount: number;
  mealCount: number;
  firstMealAt: string;
}

export interface AllUsersDishesDto {
  period: string;
  totalEntries: number;
  totalUsers: number;
  totalCuisines: number;
  entries: UserCuisineStats[];
}

/**
 * 用户已解锁的菜肴
 */
export interface UnlockedDishEntry {
  dishName: string;
  cuisine: string;
  mealCount: number;
  firstMealAt: string;
  lastMealAt: string;
  imageUrl?: string;
  calories?: number;
}

/**
 * 用户已解锁菜肴响应
 */
export interface UserUnlockedDishesDto {
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalDishes: number;
  totalMeals: number;
  dishes: UnlockedDishEntry[];
}

import { IsString, IsOptional, IsNumber, IsArray, IsDate } from 'class-validator';

export class CuisineConfigDto {
  name!: string;
  nameEn?: string;
  nameZh?: string;
  category?: string;
  icon!: string;
  color!: string;
  description?: string;
  displayOrder!: number;
}

export class CuisineUnlockDto {
  cuisineName!: string;
  icon?: string;
  color?: string;
  firstMealAt!: Date;
  mealCount!: number;
  lastMealAt?: Date;
}

export class TopCuisine {
  name!: string;
  count!: number;
}

export class RecentUnlock {
  name!: string;
  unlockedAt!: Date;
}

export class CuisineStatsDto {
  totalUnlocked!: number;
  totalAvailable!: number;
  unlockProgress!: number;
  topCuisines!: TopCuisine[];
  recentUnlocks!: RecentUnlock[];
}

export class NutritionSummary {
  avgCalories!: number;
  avgProtein!: number;
  avgFat!: number;
  avgCarbs!: number;
}

export class CuisineDetailDto {
  name!: string;
  icon?: string;
  color?: string;
  description?: string;
  mealCount!: number;
  firstMealAt!: Date;
  lastMealAt?: Date;
  nutritionSummary!: NutritionSummary;
}

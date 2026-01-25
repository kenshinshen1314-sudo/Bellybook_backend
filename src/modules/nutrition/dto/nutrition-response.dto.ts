import { IsNumber, IsString, IsArray, IsEnum, IsOptional } from 'class-validator';
import { SimpleMealResponse } from '../nutrition.service';

export class DailyNutritionDto {
  date!: string;
  totalCalories!: number;
  totalProtein!: number;
  totalFat!: number;
  totalCarbohydrates!: number;
  totalFiber!: number;
  totalSugar!: number;
  totalSodium!: number;
  mealCount!: number;
  breakfastCount!: number;
  lunchCount!: number;
  dinnerCount!: number;
  snackCount!: number;
  meals!: SimpleMealResponse[];
}

export class DailyNutritionData {
  date!: string;
  calories!: number;
  protein!: number;
  fat!: number;
  carbohydrates!: number;
}

export class Averages {
  calories!: number;
  protein!: number;
  fat!: number;
  carbohydrates!: number;
}

export class WeeklyTrendsDto {
  startDate!: string;
  endDate!: string;
  dailyData!: DailyNutritionData[];
  averages!: Averages;
  totalMeals!: number;
}

export class TopCuisine {
  name!: string;
  count!: number;
  percentage!: number;
}

export class TopMeal {
  foodName!: string;
  cuisine!: string;
  count!: number;
}

export class NutritionSummaryDto {
  period!: 'week' | 'month' | 'year' | 'all';
  startDate!: string;
  endDate!: string;
  totalMeals!: number;
  totalCalories!: number;
  averages!: Averages;
  topCuisines!: TopCuisine[];
  topMeals!: TopMeal[];
}

export class AverageValues {
  calories!: number;
  protein!: number;
  fat!: number;
  carbohydrates!: number;
  fiber!: number;
  sugar!: number;
  sodium!: number;
}

export class AverageNutritionDto {
  period!: string;
  averages!: AverageValues;
  totalDays!: number;
}

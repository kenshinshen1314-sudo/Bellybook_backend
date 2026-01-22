/**
 * [INPUT]: 依赖 @prisma/client 的类型
 * [OUTPUT]: 对外提供 Meals 模块的内部类型定义
 * [POS]: meals 模块的类型定义层，被 meals.service 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Meal, Prisma } from '@prisma/client';

// ============================================================
// AI 分析类型
// ============================================================

/**
 * AI 分析结果中的菜品信息
 */
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

/**
 * AI 分析结果
 */
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

// ============================================================
// 餐食创建/更新数据
// ============================================================

/**
 * 创建餐食的输入数据
 */
export interface CreateMealInput {
  userId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  analysis: AiAnalysis;
  mealType?: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  notes?: string;
  dishId: string;
}

/**
 * 餐食创建结果
 */
export interface MealCreateResult {
  meal: Meal;
  dish: {
    id: string;
    name: string;
    cuisine: string;
  };
}

// ============================================================
// 统计更新数据
// ============================================================

/**
 * 菜系解锁创建数据
 */
export interface CuisineUnlockCreateData {
  userId: string;
  cuisineName: string;
  firstMealAt: Date;
  mealCount: number;
  lastMealAt: Date;
  cuisineIcon?: string | null;
  cuisineColor?: string | null;
}

/**
 * 菜品解锁创建数据
 */
export interface DishUnlockCreateData {
  userId: string;
  dishName: string;
  firstMealAt: Date;
  mealCount: number;
  lastMealAt: Date;
}

/**
 * 每日营养创建数据
 */
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

// ============================================================
// 查询过滤器
// ============================================================

/**
 * 餐食查询过滤器
 */
export interface MealFilters {
  mealType?: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  startDate?: string;
  endDate?: string;
  cuisine?: string;
}

// ============================================================
// 辅助函数类型
// ============================================================

/**
 * 解锁记录（存在时）
 */
export interface ExistingUnlock {
  id: string;
  mealCount: number;
}

/**
 * 解锁更新数据
 */
export interface UnlockUpdateData {
  mealCount: number;
  lastMealAt: Date;
}

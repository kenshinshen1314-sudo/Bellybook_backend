/**
 * [INPUT]: 无依赖，纯类型定义
 * [OUTPUT]: 对外提供 AI 分析相关的所有类型定义
 * [POS]: ai 模块的核心类型契约，被 ai.service、meals 模块共享
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

/**
 * 单个菜品的营养信息
 */
export interface Nutrition {
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

/**
 * 单个菜品信息
 */
export interface DishInfo {
  foodName: string;
  cuisine: string;
  nutrition: Nutrition;
}

/**
 * AI 分析返回的完整数据结构
 * 统一契约：始终返回 dishes 数组（单菜品也是数组长度为 1）
 */
export interface FoodAnalysisResult {
  /** 核心：菜品数组（统一数据结构） */
  dishes: DishInfo[];
  /** 总营养数据（所有菜品汇总，方便前端直接使用） */
  nutrition: Nutrition;
  /** 其他元数据 */
  plating?: string;
  description?: string;
  ingredients?: string[];
  historicalOrigins?: string;
  poeticDescription?: string;
  foodNamePoetic?: string;
  foodPrice?: number;
  dishSuggestion?: string;
}

/**
 * 菜品知识库输入参数
 * 用于创建或更新菜品记录
 */
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

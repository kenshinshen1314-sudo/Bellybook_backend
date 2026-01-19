"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CuisineDetailDto = exports.NutritionSummary = exports.CuisineStatsDto = exports.RecentUnlock = exports.TopCuisine = exports.CuisineUnlockDto = exports.CuisineConfigDto = void 0;
class CuisineConfigDto {
    name;
    nameEn;
    nameZh;
    category;
    icon;
    color;
    description;
    displayOrder;
}
exports.CuisineConfigDto = CuisineConfigDto;
class CuisineUnlockDto {
    cuisineName;
    icon;
    color;
    firstMealAt;
    mealCount;
    lastMealAt;
}
exports.CuisineUnlockDto = CuisineUnlockDto;
class TopCuisine {
    name;
    count;
}
exports.TopCuisine = TopCuisine;
class RecentUnlock {
    name;
    unlockedAt;
}
exports.RecentUnlock = RecentUnlock;
class CuisineStatsDto {
    totalUnlocked;
    totalAvailable;
    unlockProgress;
    topCuisines;
    recentUnlocks;
}
exports.CuisineStatsDto = CuisineStatsDto;
class NutritionSummary {
    avgCalories;
    avgProtein;
    avgFat;
    avgCarbs;
}
exports.NutritionSummary = NutritionSummary;
class CuisineDetailDto {
    name;
    icon;
    color;
    description;
    mealCount;
    firstMealAt;
    lastMealAt;
    nutritionSummary;
}
exports.CuisineDetailDto = CuisineDetailDto;
//# sourceMappingURL=cuisine-response.dto.js.map
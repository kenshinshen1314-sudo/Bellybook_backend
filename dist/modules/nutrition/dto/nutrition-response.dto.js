"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AverageNutritionDto = exports.AverageValues = exports.NutritionSummaryDto = exports.TopMeal = exports.TopCuisine = exports.WeeklyTrendsDto = exports.Averages = exports.DailyNutritionData = exports.DailyNutritionDto = void 0;
class DailyNutritionDto {
    date;
    totalCalories;
    totalProtein;
    totalFat;
    totalCarbohydrates;
    totalFiber;
    totalSugar;
    totalSodium;
    mealCount;
    breakfastCount;
    lunchCount;
    dinnerCount;
    snackCount;
    meals;
}
exports.DailyNutritionDto = DailyNutritionDto;
class DailyNutritionData {
    date;
    calories;
    protein;
    fat;
    carbohydrates;
}
exports.DailyNutritionData = DailyNutritionData;
class Averages {
    calories;
    protein;
    fat;
    carbohydrates;
}
exports.Averages = Averages;
class WeeklyTrendsDto {
    startDate;
    endDate;
    dailyData;
    averages;
    totalMeals;
}
exports.WeeklyTrendsDto = WeeklyTrendsDto;
class TopCuisine {
    name;
    count;
    percentage;
}
exports.TopCuisine = TopCuisine;
class TopMeal {
    foodName;
    cuisine;
    count;
}
exports.TopMeal = TopMeal;
class NutritionSummaryDto {
    period;
    startDate;
    endDate;
    totalMeals;
    totalCalories;
    averages;
    topCuisines;
    topMeals;
}
exports.NutritionSummaryDto = NutritionSummaryDto;
class AverageValues {
    calories;
    protein;
    fat;
    carbohydrates;
    fiber;
    sugar;
    sodium;
}
exports.AverageValues = AverageValues;
class AverageNutritionDto {
    period;
    averages;
    totalDays;
}
exports.AverageNutritionDto = AverageNutritionDto;
//# sourceMappingURL=nutrition-response.dto.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginatedMealsDto = exports.MealResponseDto = void 0;
class MealResponseDto {
    id;
    userId;
    imageUrl;
    thumbnailUrl;
    analysis;
    mealType;
    notes;
    createdAt;
    updatedAt;
    isSynced;
    version;
}
exports.MealResponseDto = MealResponseDto;
class PaginatedMealsDto {
    data;
    total;
    page;
    limit;
    hasMore;
}
exports.PaginatedMealsDto = PaginatedMealsDto;
//# sourceMappingURL=meal-response.dto.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateMealDto = exports.MealAnalysis = exports.DishInfo = exports.Ingredient = exports.Nutrition = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class Nutrition {
    calories;
    protein;
    fat;
    carbohydrates;
    fiber;
    sugar;
    sodium;
}
exports.Nutrition = Nutrition;
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], Nutrition.prototype, "calories", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], Nutrition.prototype, "protein", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], Nutrition.prototype, "fat", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], Nutrition.prototype, "carbohydrates", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], Nutrition.prototype, "fiber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], Nutrition.prototype, "sugar", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], Nutrition.prototype, "sodium", void 0);
class Ingredient {
    name;
    percentage;
    icon;
    description;
}
exports.Ingredient = Ingredient;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Ingredient.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], Ingredient.prototype, "percentage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Ingredient.prototype, "icon", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Ingredient.prototype, "description", void 0);
class DishInfo {
    foodName;
    cuisine;
    nutrition;
}
exports.DishInfo = DishInfo;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DishInfo.prototype, "foodName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DishInfo.prototype, "cuisine", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    __metadata("design:type", Nutrition)
], DishInfo.prototype, "nutrition", void 0);
class MealAnalysis {
    dishes;
    nutrition;
    plating;
    sensory;
    container;
    description;
    ingredients;
    suggestions;
    poeticDescription;
    foodNamePoetic;
    foodPrice;
    historicalOrigins;
    nutritionCommentary;
    dishSuggestion;
    analyzedAt;
}
exports.MealAnalysis = MealAnalysis;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => DishInfo),
    __metadata("design:type", Array)
], MealAnalysis.prototype, "dishes", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    __metadata("design:type", Nutrition)
], MealAnalysis.prototype, "nutrition", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MealAnalysis.prototype, "plating", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MealAnalysis.prototype, "sensory", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MealAnalysis.prototype, "container", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MealAnalysis.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], MealAnalysis.prototype, "ingredients", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], MealAnalysis.prototype, "suggestions", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MealAnalysis.prototype, "poeticDescription", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MealAnalysis.prototype, "foodNamePoetic", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], MealAnalysis.prototype, "foodPrice", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MealAnalysis.prototype, "historicalOrigins", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MealAnalysis.prototype, "nutritionCommentary", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MealAnalysis.prototype, "dishSuggestion", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MealAnalysis.prototype, "analyzedAt", void 0);
class CreateMealDto {
    imageUrl;
    thumbnailUrl;
    analysis;
    mealType;
    notes;
}
exports.CreateMealDto = CreateMealDto;
__decorate([
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CreateMealDto.prototype, "imageUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CreateMealDto.prototype, "thumbnailUrl", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => MealAnalysis),
    __metadata("design:type", MealAnalysis)
], CreateMealDto.prototype, "analysis", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']),
    __metadata("design:type", String)
], CreateMealDto.prototype, "mealType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateMealDto.prototype, "notes", void 0);
//# sourceMappingURL=create-meal.dto.js.map
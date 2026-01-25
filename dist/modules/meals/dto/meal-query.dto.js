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
exports.MealQueryDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
function IsDateFormat() {
    return function (target, propertyKey) {
        (0, class_validator_1.IsDateString)()(target, propertyKey);
    };
}
class MealQueryDto {
    page = 1;
    limit = 20;
    offset;
    mealType;
    startDate;
    endDate;
    cuisine;
    sortBy;
    sortOrder;
}
exports.MealQueryDto = MealQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], MealQueryDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], MealQueryDto.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], MealQueryDto.prototype, "offset", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'], {
        message: 'mealType must be one of: BREAKFAST, LUNCH, DINNER, SNACK'
    }),
    __metadata("design:type", String)
], MealQueryDto.prototype, "mealType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, {
        message: 'startDate must be a valid ISO 8601 date string (YYYY-MM-DD)'
    }),
    __metadata("design:type", String)
], MealQueryDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, {
        message: 'endDate must be a valid ISO 8601 date string (YYYY-MM-DD)'
    }),
    __metadata("design:type", String)
], MealQueryDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MealQueryDto.prototype, "cuisine", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['createdAt', 'calories', 'protein'], {
        message: 'sortBy must be one of: createdAt, calories, protein'
    }),
    __metadata("design:type", String)
], MealQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['asc', 'desc'], {
        message: 'sortOrder must be either "asc" or "desc"'
    }),
    __metadata("design:type", String)
], MealQueryDto.prototype, "sortOrder", void 0);
//# sourceMappingURL=meal-query.dto.js.map
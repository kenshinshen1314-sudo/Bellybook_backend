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
exports.UpdateSettingsDto = void 0;
const class_validator_1 = require("class-validator");
const VALID_TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
class UpdateSettingsDto {
    language;
    theme;
    notificationsEnabled;
    breakfastReminderTime;
    lunchReminderTime;
    dinnerReminderTime;
    hideRanking;
}
exports.UpdateSettingsDto = UpdateSettingsDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['ZH', 'EN'], {
        message: 'language must be either "ZH" or "EN"'
    }),
    __metadata("design:type", String)
], UpdateSettingsDto.prototype, "language", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['LIGHT', 'DARK', 'AUTO'], {
        message: 'theme must be one of: LIGHT, DARK, AUTO'
    }),
    __metadata("design:type", String)
], UpdateSettingsDto.prototype, "theme", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateSettingsDto.prototype, "notificationsEnabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(VALID_TIME_REGEX, {
        message: 'breakfastReminderTime must be in HH:MM format (00:00-23:59)'
    }),
    __metadata("design:type", String)
], UpdateSettingsDto.prototype, "breakfastReminderTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(VALID_TIME_REGEX, {
        message: 'lunchReminderTime must be in HH:MM format (00:00-23:59)'
    }),
    __metadata("design:type", String)
], UpdateSettingsDto.prototype, "lunchReminderTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(VALID_TIME_REGEX, {
        message: 'dinnerReminderTime must be in HH:MM format (00:00-23:59)'
    }),
    __metadata("design:type", String)
], UpdateSettingsDto.prototype, "dinnerReminderTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateSettingsDto.prototype, "hideRanking", void 0);
//# sourceMappingURL=update-settings.dto.js.map
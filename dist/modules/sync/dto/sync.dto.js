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
exports.ConflictResolutionDto = exports.SyncStatusResponseDto = exports.SyncPushResponseDto = exports.SyncPushConflictItem = exports.SyncPushFailedItem = exports.SyncPushRequestDto = exports.SyncPushItem = exports.SyncPullResponseDto = exports.CuisineUnlockDto = void 0;
const class_validator_1 = require("class-validator");
class CuisineUnlockDto {
    cuisineName;
    icon;
    color;
    firstMealAt;
    mealCount;
    lastMealAt;
}
exports.CuisineUnlockDto = CuisineUnlockDto;
class SyncPullResponseDto {
    meals;
    profile;
    settings;
    cuisineUnlocks;
    serverTime;
    hasMore;
}
exports.SyncPullResponseDto = SyncPullResponseDto;
class SyncPushItem {
    id;
    type;
    payload;
    clientId;
    timestamp;
}
exports.SyncPushItem = SyncPushItem;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SyncPushItem.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['CREATE_MEAL', 'UPDATE_MEAL', 'DELETE_MEAL', 'UPDATE_PROFILE', 'UPDATE_SETTINGS']),
    __metadata("design:type", String)
], SyncPushItem.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], SyncPushItem.prototype, "payload", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SyncPushItem.prototype, "clientId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SyncPushItem.prototype, "timestamp", void 0);
class SyncPushRequestDto {
    items;
}
exports.SyncPushRequestDto = SyncPushRequestDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], SyncPushRequestDto.prototype, "items", void 0);
class SyncPushFailedItem {
    clientId;
    error;
    code;
}
exports.SyncPushFailedItem = SyncPushFailedItem;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SyncPushFailedItem.prototype, "clientId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SyncPushFailedItem.prototype, "error", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SyncPushFailedItem.prototype, "code", void 0);
class SyncPushConflictItem {
    clientId;
    type;
    serverVersion;
    clientVersion;
}
exports.SyncPushConflictItem = SyncPushConflictItem;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SyncPushConflictItem.prototype, "clientId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SyncPushConflictItem.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SyncPushConflictItem.prototype, "serverVersion", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SyncPushConflictItem.prototype, "clientVersion", void 0);
class SyncPushResponseDto {
    success;
    failed;
    conflicts;
    serverTime;
}
exports.SyncPushResponseDto = SyncPushResponseDto;
class SyncStatusResponseDto {
    pendingItems;
    lastSyncAt;
    serverTime;
    isHealthy;
}
exports.SyncStatusResponseDto = SyncStatusResponseDto;
class ConflictResolutionDto {
    recordId;
    table;
    resolution;
    manualValue;
}
exports.ConflictResolutionDto = ConflictResolutionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConflictResolutionDto.prototype, "recordId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConflictResolutionDto.prototype, "table", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['LAST_WRITE_WINS', 'SERVER_WINS', 'CLIENT_WINS', 'MANUAL']),
    __metadata("design:type", String)
], ConflictResolutionDto.prototype, "resolution", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], ConflictResolutionDto.prototype, "manualValue", void 0);
//# sourceMappingURL=sync.dto.js.map
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncController = void 0;
const common_1 = require("@nestjs/common");
const sync_service_1 = require("./sync.service");
const sync_dto_1 = require("./dto/sync.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const response_dto_1 = require("../../common/dto/response.dto");
let SyncController = class SyncController {
    syncService;
    constructor(syncService) {
        this.syncService = syncService;
    }
    async pull(userId, lastSyncAtStr) {
        const lastSyncAt = lastSyncAtStr ? new Date(lastSyncAtStr) : undefined;
        return this.syncService.pull(userId, lastSyncAt);
    }
    async push(userId, dto) {
        return this.syncService.push(userId, dto);
    }
    async getStatus(userId) {
        return this.syncService.getStatus(userId);
    }
    async fullSync(userId) {
        return this.syncService.pull(userId);
    }
    async clearQueue(userId) {
        await this.syncService.clearQueue(userId);
        return new response_dto_1.SuccessResponse(null, 'Sync queue cleared');
    }
};
exports.SyncController = SyncController;
__decorate([
    (0, common_1.Get)('pull'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Query)('lastSyncAt')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "pull", null);
__decorate([
    (0, common_1.Post)('push'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, sync_dto_1.SyncPushRequestDto]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "push", null);
__decorate([
    (0, common_1.Get)('status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Post)('full'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "fullSync", null);
__decorate([
    (0, common_1.Delete)('queue'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "clearQueue", null);
exports.SyncController = SyncController = __decorate([
    (0, common_1.Controller)('sync'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [sync_service_1.SyncService])
], SyncController);
//# sourceMappingURL=sync.controller.js.map
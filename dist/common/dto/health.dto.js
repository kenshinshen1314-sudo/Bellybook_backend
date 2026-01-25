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
exports.SimpleHealthCheckDto = exports.HealthCheckDto = exports.ServiceStatus = void 0;
const swagger_1 = require("@nestjs/swagger");
class ServiceStatus {
    name;
    status;
    responseTime;
    error;
    metadata;
}
exports.ServiceStatus = ServiceStatus;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '服务名称', example: 'database' }),
    __metadata("design:type", String)
], ServiceStatus.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '状态', example: 'up', enum: ['up', 'down', 'degraded'] }),
    __metadata("design:type", String)
], ServiceStatus.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '响应时间（毫秒）', required: false, example: 5 }),
    __metadata("design:type", Number)
], ServiceStatus.prototype, "responseTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '错误信息', required: false }),
    __metadata("design:type", String)
], ServiceStatus.prototype, "error", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '服务元数据（如连接池统计）', required: false }),
    __metadata("design:type", Object)
], ServiceStatus.prototype, "metadata", void 0);
class HealthCheckDto {
    status;
    services;
    timestamp;
    uptime;
    environment;
    version;
}
exports.HealthCheckDto = HealthCheckDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '整体状态', example: 'ok', enum: ['ok', 'degraded', 'down'] }),
    __metadata("design:type", String)
], HealthCheckDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '服务状态列表', type: [ServiceStatus] }),
    __metadata("design:type", Array)
], HealthCheckDto.prototype, "services", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '当前时间戳', example: '2024-01-01T00:00:00.000Z' }),
    __metadata("design:type", String)
], HealthCheckDto.prototype, "timestamp", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '运行时间（秒）', example: 3600 }),
    __metadata("design:type", Number)
], HealthCheckDto.prototype, "uptime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '环境', example: 'production' }),
    __metadata("design:type", String)
], HealthCheckDto.prototype, "environment", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '版本', required: false, example: '1.0.0' }),
    __metadata("design:type", String)
], HealthCheckDto.prototype, "version", void 0);
class SimpleHealthCheckDto {
    status;
    timestamp;
}
exports.SimpleHealthCheckDto = SimpleHealthCheckDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '状态', example: 'ok' }),
    __metadata("design:type", String)
], SimpleHealthCheckDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '当前时间戳', example: '2024-01-01T00:00:00.000Z' }),
    __metadata("design:type", String)
], SimpleHealthCheckDto.prototype, "timestamp", void 0);
//# sourceMappingURL=health.dto.js.map
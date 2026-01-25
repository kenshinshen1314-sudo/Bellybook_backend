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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_service_1 = require("./app.service");
const health_dto_1 = require("./common/dto/health.dto");
let AppController = class AppController {
    appService;
    constructor(appService) {
        this.appService = appService;
    }
    getSimpleHealth() {
        return this.appService.getSimpleHealth();
    }
    async getHealth() {
        return this.appService.getHealth();
    }
    getHello() {
        return { message: this.appService.getHello() };
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: '简单健康检查',
        description: '返回基本状态，用于负载均衡器探针',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '服务正常',
        type: health_dto_1.SimpleHealthCheckDto,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", health_dto_1.SimpleHealthCheckDto)
], AppController.prototype, "getSimpleHealth", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiTags)('Health'),
    (0, swagger_1.ApiOperation)({
        summary: '详细健康检查',
        description: '返回所有依赖服务的状态，包括数据库、缓存等',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '服务正常',
        type: health_dto_1.HealthCheckDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 503,
        description: '服务不可用',
        schema: {
            example: {
                status: 'down',
                services: [
                    {
                        name: 'database',
                        status: 'down',
                        error: 'Connection refused',
                    },
                ],
                timestamp: '2024-01-01T00:00:00.000Z',
                uptime: 0,
                environment: 'production',
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('hello'),
    (0, swagger_1.ApiOperation)({
        summary: 'Hello World',
        description: '测试接口',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '成功',
        schema: { example: { message: 'Bellybook API is running!' } },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], AppController.prototype, "getHello", null);
exports.AppController = AppController = __decorate([
    (0, swagger_1.ApiExcludeController)(),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService])
], AppController);
//# sourceMappingURL=app.controller.js.map
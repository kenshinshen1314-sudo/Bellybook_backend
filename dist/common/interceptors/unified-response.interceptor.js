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
exports.UnifiedResponseInterceptor = exports.SKIP_UNIFIED_RESPONSE = void 0;
exports.SkipUnifiedResponse = SkipUnifiedResponse;
exports.createSuccessResponse = createSuccessResponse;
exports.createPaginatedResponse = createPaginatedResponse;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const core_1 = require("@nestjs/core");
exports.SKIP_UNIFIED_RESPONSE = 'skip_unified_response';
let UnifiedResponseInterceptor = class UnifiedResponseInterceptor {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    intercept(context, next) {
        const skipUnifiedResponse = this.reflector.getAllAndOverride(exports.SKIP_UNIFIED_RESPONSE, [context.getHandler(), context.getClass()]);
        if (skipUnifiedResponse) {
            return next.handle();
        }
        const request = context.switchToHttp().getRequest();
        const path = request.url;
        const timestamp = new Date().toISOString();
        return next.handle().pipe((0, operators_1.map)((data) => {
            if (data && typeof data === 'object' && 'success' in data) {
                return data;
            }
            if (this.isPaginatedResponse(data)) {
                return {
                    success: true,
                    data: data.data || [],
                    pagination: {
                        page: data.page || 1,
                        limit: data.limit || 20,
                        total: data.total || 0,
                        hasMore: data.hasMore || false,
                    },
                    timestamp,
                    path,
                };
            }
            return {
                success: true,
                data,
                timestamp,
                path,
            };
        }));
    }
    isPaginatedResponse(data) {
        return (data &&
            typeof data === 'object' &&
            ('page' in data ||
                'limit' in data ||
                'total' in data ||
                'hasMore' in data ||
                'pagination' in data));
    }
};
exports.UnifiedResponseInterceptor = UnifiedResponseInterceptor;
exports.UnifiedResponseInterceptor = UnifiedResponseInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], UnifiedResponseInterceptor);
function SkipUnifiedResponse() {
    return function (target, propertyKey, descriptor) {
        Reflect.defineMetadata(exports.SKIP_UNIFIED_RESPONSE, true, descriptor.value);
    };
}
function createSuccessResponse(data, message, code) {
    const request = globalThis.__request;
    return {
        success: true,
        data,
        ...(message && { message }),
        ...(code && { code }),
        timestamp: new Date().toISOString(),
        path: request?.url || '',
    };
}
function createPaginatedResponse(data, pagination, message, code) {
    const request = globalThis.__request;
    return {
        success: true,
        data,
        pagination,
        ...(message && { message }),
        ...(code && { code }),
        timestamp: new Date().toISOString(),
        path: request?.url || '',
    };
}
//# sourceMappingURL=unified-response.interceptor.js.map
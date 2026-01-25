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
exports.CacheTTL = exports.CacheInterceptor = exports.NO_CACHE_METADATA = exports.CACHE_TTL_METADATA = void 0;
exports.Cache = Cache;
exports.NoCache = NoCache;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const core_1 = require("@nestjs/core");
exports.CACHE_TTL_METADATA = 'cache_ttl';
exports.NO_CACHE_METADATA = 'no_cache';
let CacheInterceptor = class CacheInterceptor {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    intercept(context, next) {
        const noCache = this.reflector.getAllAndOverride(exports.NO_CACHE_METADATA, [context.getHandler(), context.getClass()]);
        if (noCache) {
            const response = context.switchToHttp().getResponse();
            response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            response.setHeader('Pragma', 'no-cache');
            response.setHeader('Expires', '0');
            return next.handle();
        }
        const cacheOptions = this.reflector.getAllAndOverride(exports.CACHE_TTL_METADATA, [context.getHandler(), context.getClass()]);
        if (!cacheOptions || cacheOptions.noCache) {
            return next.handle();
        }
        return next.handle().pipe((0, operators_1.map)((data) => {
            const response = context.switchToHttp().getResponse();
            const directives = [];
            if (cacheOptions.ttl !== undefined) {
                directives.push(`max-age=${cacheOptions.ttl}`);
            }
            if (cacheOptions.mustRevalidate) {
                directives.push('must-revalidate');
            }
            if (cacheOptions.noStore) {
                directives.push('no-store');
            }
            if (directives.length > 0) {
                response.setHeader('Cache-Control', directives.join(', '));
            }
            if (data && typeof data === 'object') {
                const etag = this.generateETag(data);
                response.setHeader('ETag', etag);
            }
            return data;
        }));
    }
    generateETag(data) {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `"${hash.toString(16)}"`;
    }
};
exports.CacheInterceptor = CacheInterceptor;
exports.CacheInterceptor = CacheInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], CacheInterceptor);
function Cache(ttl, options) {
    return function (target, propertyKey, descriptor) {
        Reflect.defineMetadata(exports.CACHE_TTL_METADATA, { ttl, ...options }, descriptor.value);
    };
}
function NoCache() {
    return function (target, propertyKey, descriptor) {
        Reflect.defineMetadata(exports.NO_CACHE_METADATA, true, descriptor.value);
    };
}
exports.CacheTTL = {
    MINUTE: 60,
    FIVE_MINUTES: 300,
    FIFTEEN_MINUTES: 900,
    HALF_HOUR: 1800,
    HOUR: 3600,
    SIX_HOURS: 21600,
    DAY: 86400,
    WEEK: 604800,
};
//# sourceMappingURL=cache.interceptor.js.map
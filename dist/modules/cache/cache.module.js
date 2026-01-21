"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheModuleClass = exports.NestJSCacheModule = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const config_1 = require("@nestjs/config");
const cache_manager_redis_store_1 = require("cache-manager-redis-store");
const cache_service_1 = require("./cache.service");
var cache_manager_2 = require("@nestjs/cache-manager");
Object.defineProperty(exports, "NestJSCacheModule", { enumerable: true, get: function () { return cache_manager_2.CacheModule; } });
let CacheModuleClass = class CacheModuleClass {
};
exports.CacheModuleClass = CacheModuleClass;
exports.CacheModuleClass = CacheModuleClass = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            cache_manager_1.CacheModule.registerAsync({
                isGlobal: true,
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: async (configService) => {
                    const redisHost = configService.get('REDIS_HOST');
                    const redisPort = configService.get('REDIS_PORT');
                    const redisPassword = configService.get('REDIS_PASSWORD');
                    const redisDb = configService.get('REDIS_DB');
                    const redisUrl = `redis://${redisPassword ? `:${redisPassword}@` : ''}${redisHost}:${redisPort}/${redisDb}`;
                    return {
                        store: await cache_manager_redis_store_1.redisStore,
                        url: redisUrl,
                        ttl: 300,
                        isGlobal: true,
                    };
                },
            }),
        ],
        providers: [cache_service_1.CacheService],
        exports: [cache_service_1.CacheService, cache_manager_1.CacheModule],
    })
], CacheModuleClass);
//# sourceMappingURL=cache.module.js.map
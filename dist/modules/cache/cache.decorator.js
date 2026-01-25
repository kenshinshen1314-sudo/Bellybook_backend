"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CACHE_TTL_METADATA = exports.CACHE_KEY_METADATA = void 0;
exports.generateCacheKey = generateCacheKey;
exports.Cacheable = Cacheable;
exports.CacheInvalidate = CacheInvalidate;
exports.CachePut = CachePut;
exports.CacheWarmup = CacheWarmup;
const common_1 = require("@nestjs/common");
const cache_constants_1 = require("./cache.constants");
exports.CACHE_KEY_METADATA = 'cache:key';
exports.CACHE_TTL_METADATA = 'cache:ttl';
function generateCacheKey(prefix, args) {
    const sortedArgs = Object.keys(args)
        .sort()
        .map(key => `${key}=${JSON.stringify(args[key])}`)
        .join('&');
    return sortedArgs ? `${prefix}:${sortedArgs}` : prefix;
}
function Cacheable(prefix, paramNames = [], ttl = cache_constants_1.CacheTTL.MEDIUM) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        (0, common_1.SetMetadata)(exports.CACHE_KEY_METADATA, { prefix, paramNames })(target, propertyKey, descriptor);
        descriptor.value = async function (...args) {
            const cacheService = this.cacheService;
            const statsService = this.cacheStatsService;
            if (!cacheService) {
                return originalMethod.apply(this, args);
            }
            const params = {};
            paramNames.forEach((name, index) => {
                params[name] = args[index];
            });
            const cacheKey = generateCacheKey(prefix, params);
            const startTime = Date.now();
            const cached = await cacheService.get(cacheKey);
            const duration = (Date.now() - startTime) / 1000;
            if (statsService) {
                statsService.recordGetDuration(cacheKey, duration);
            }
            if (cached !== undefined) {
                if (statsService) {
                    statsService.recordHit(cacheKey);
                }
                return cached;
            }
            if (statsService) {
                statsService.recordMiss(cacheKey);
            }
            const result = await originalMethod.apply(this, args);
            await cacheService.set(cacheKey, result, ttl);
            if (statsService) {
                statsService.recordSet(cacheKey);
                const setDuration = (Date.now() - startTime) / 1000 - duration;
                statsService.recordSetDuration(cacheKey, setDuration);
            }
            return result;
        };
        return descriptor;
    };
}
function CacheInvalidate(prefix, paramNames = [], pattern = null) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const cacheService = this.cacheService;
            const statsService = this.cacheStatsService;
            const result = await originalMethod.apply(this, args);
            if (!cacheService) {
                return result;
            }
            const params = {};
            paramNames.forEach((name, index) => {
                params[name] = args[index];
            });
            if (pattern) {
                await cacheService.delPattern(pattern);
            }
            else {
                const cacheKey = generateCacheKey(prefix, params);
                await cacheService.del(cacheKey);
                if (statsService) {
                    statsService.recordDelete(cacheKey);
                }
            }
            return result;
        };
        return descriptor;
    };
}
function CachePut(prefix, paramNames = [], ttl = cache_constants_1.CacheTTL.MEDIUM) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const cacheService = this.cacheService;
            const statsService = this.cacheStatsService;
            const result = await originalMethod.apply(this, args);
            if (!cacheService) {
                return result;
            }
            const params = {};
            paramNames.forEach((name, index) => {
                params[name] = args[index];
            });
            const cacheKey = generateCacheKey(prefix, params);
            await cacheService.set(cacheKey, result, ttl);
            if (statsService) {
                statsService.recordSet(cacheKey);
            }
            return result;
        };
        return descriptor;
    };
}
function CacheWarmup(keys) {
    return function (target) {
        const originalOnModuleInit = target.prototype.onModuleInit;
        target.prototype.onModuleInit = async function (...args) {
            if (originalOnModuleInit) {
                await originalOnModuleInit.apply(this, args);
            }
            const cacheService = this.cacheService;
            const logger = new common_1.Logger(CacheWarmup.name);
            if (!cacheService) {
                return;
            }
            logger.log(`Starting cache warmup for ${keys.length} keys...`);
            for (const { key, factory } of keys) {
                try {
                    const data = await this[factory].call(this);
                    await cacheService.set(key, data);
                    logger.debug(`Cache warmed: ${key}`);
                }
                catch (error) {
                    logger.warn(`Failed to warm cache for ${key}: ${error.message}`);
                }
            }
            logger.log('Cache warmup completed');
        };
    };
}
//# sourceMappingURL=cache.decorator.js.map
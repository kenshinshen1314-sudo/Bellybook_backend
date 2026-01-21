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
var CacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = exports.CachePrefix = exports.CacheTTL = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
exports.CacheTTL = {
    SHORT: 60,
    MEDIUM: 300,
    LONG: 1800,
    VERY_LONG: 3600,
    DAILY: 86400,
};
exports.CachePrefix = {
    USER: 'user',
    USER_PROFILE: 'user:profile',
    USER_SETTINGS: 'user:settings',
    RANKING: 'ranking',
    CUISINE_CONFIGS: 'cuisine:configs',
    DISH_INFO: 'dish:info',
    AI_ANALYSIS: 'ai:analysis',
};
let CacheService = CacheService_1 = class CacheService {
    cacheManager;
    logger = new common_1.Logger(CacheService_1.name);
    constructor(cacheManager) {
        this.cacheManager = cacheManager;
    }
    async get(key) {
        try {
            const value = await this.cacheManager.get(key);
            if (value !== undefined && value !== null) {
                this.logger.debug(`Cache hit: ${key}`);
                return value;
            }
            this.logger.debug(`Cache miss: ${key}`);
            return undefined;
        }
        catch (error) {
            this.logger.warn(`Cache get error for key "${key}": ${error.message}`);
            return undefined;
        }
    }
    async set(key, value, ttl) {
        try {
            await this.cacheManager.set(key, value, ttl);
            this.logger.debug(`Cache set: ${key}, TTL: ${ttl || 'default'}s`);
        }
        catch (error) {
            this.logger.warn(`Cache set error for key "${key}": ${error.message}`);
        }
    }
    async del(key) {
        try {
            await this.cacheManager.del(key);
            this.logger.debug(`Cache deleted: ${key}`);
        }
        catch (error) {
            this.logger.warn(`Cache delete error for key "${key}": ${error.message}`);
        }
    }
    async delPattern(pattern) {
        try {
            this.logger.debug(`Cache delPattern requested: ${pattern}`);
        }
        catch (error) {
            this.logger.warn(`Cache delPattern error for "${pattern}": ${error.message}`);
        }
    }
    async reset() {
        try {
            this.logger.warn('Cache reset: all cache cleared');
        }
        catch (error) {
            this.logger.warn(`Cache reset error: ${error.message}`);
        }
    }
    async getOrSet(key, factory, ttl) {
        const cached = await this.get(key);
        if (cached !== undefined) {
            return cached;
        }
        const value = await factory();
        await this.set(key, value, ttl);
        return value;
    }
    async getWithPrefix(prefix, key) {
        return this.get(`${prefix}:${key}`);
    }
    async setWithPrefix(prefix, key, value, ttl) {
        return this.set(`${prefix}:${key}`, value, ttl);
    }
    async delWithPrefix(prefix, key) {
        return this.del(`${prefix}:${key}`);
    }
    async setMany(entries) {
        await Promise.all(entries.map(({ key, value, ttl }) => this.set(key, value, ttl)));
    }
    async getMany(keys) {
        const results = await Promise.all(keys.map(async (key) => ({
            key,
            value: await this.get(key),
        })));
        return results;
    }
    logCacheHit(pattern, hit) {
        if (hit) {
            this.logger.debug(`Cache HIT: ${pattern}`);
        }
        else {
            this.logger.debug(`Cache MISS: ${pattern}`);
        }
    }
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = CacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [cache_manager_1.Cache])
], CacheService);
//# sourceMappingURL=cache.service.js.map
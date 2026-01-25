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
exports.CacheService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const redis_1 = require("redis");
const env_1 = require("../../config/env");
const cache_stats_service_1 = require("./cache-stats.service");
const cache_constants_1 = require("./cache.constants");
const singleFlightMap = new Map();
let CacheService = CacheService_1 = class CacheService {
    cacheManager;
    statsService;
    logger = new common_1.Logger(CacheService_1.name);
    redisClient = null;
    redisAvailable = false;
    redisInitAttempted = false;
    constructor(cacheManager, statsService) {
        this.cacheManager = cacheManager;
        this.statsService = statsService;
        setImmediate(() => {
            this.initRedisClient();
        });
    }
    async initRedisClient() {
        if (this.redisInitAttempted) {
            return;
        }
        this.redisInitAttempted = true;
        try {
            this.redisClient = (0, redis_1.createClient)({
                socket: {
                    host: env_1.env.REDIS_HOST,
                    port: env_1.env.REDIS_PORT,
                    connectTimeout: 5000,
                },
                password: env_1.env.REDIS_PASSWORD || undefined,
                database: env_1.env.REDIS_DB,
            });
            let errorLogged = false;
            this.redisClient.on('error', (err) => {
                if (!errorLogged) {
                    this.logger.warn(`Redis client unavailable: ${err.message}. Advanced cache operations will be disabled.`);
                    this.redisAvailable = false;
                    errorLogged = true;
                }
            });
            this.redisClient.on('ready', () => {
                this.redisAvailable = true;
                this.logger.log('Redis client connected successfully');
            });
            await this.redisClient.connect().catch((err) => {
                if (!errorLogged) {
                    this.logger.warn(`Redis connection failed: ${err.message}. Using fallback cache manager.`);
                    errorLogged = true;
                }
                this.redisAvailable = false;
                this.redisClient = null;
            });
        }
        catch (error) {
            this.logger.warn(`Failed to initialize Redis client: ${error.message}. Using fallback cache manager.`);
            this.redisClient = null;
            this.redisAvailable = false;
        }
    }
    async get(key) {
        const startTime = Date.now();
        try {
            const value = await this.cacheManager.get(key);
            if (value !== undefined && value !== null) {
                this.statsService.recordHit(key);
                const duration = (Date.now() - startTime) / 1000;
                this.statsService.recordGetDuration(key, duration);
                return value;
            }
            this.statsService.recordMiss(key);
            const duration = (Date.now() - startTime) / 1000;
            this.statsService.recordGetDuration(key, duration);
            return undefined;
        }
        catch (error) {
            this.statsService.recordError('get', key);
            this.logger.warn(`Cache get error for key "${key}": ${error.message}`);
            return undefined;
        }
    }
    async set(key, value, ttl) {
        const startTime = Date.now();
        try {
            await this.cacheManager.set(key, value, ttl);
            this.statsService.recordSet(key);
            const duration = (Date.now() - startTime) / 1000;
            this.statsService.recordSetDuration(key, duration);
        }
        catch (error) {
            this.statsService.recordError('set', key);
            this.logger.warn(`Cache set error for key "${key}": ${error.message}`);
        }
    }
    async del(key) {
        try {
            await this.cacheManager.del(key);
            this.statsService.recordDelete(key);
        }
        catch (error) {
            this.statsService.recordError('del', key);
            this.logger.warn(`Cache delete error for key "${key}": ${error.message}`);
        }
    }
    async delPattern(pattern) {
        if (!this.redisClient || !this.redisAvailable) {
            return 0;
        }
        try {
            let cursor = 0;
            let deletedCount = 0;
            do {
                const result = await this.redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
                cursor = result.cursor;
                const keys = result.keys;
                if (keys.length > 0) {
                    await this.redisClient.del(keys);
                    deletedCount += keys.length;
                    keys.forEach(key => this.statsService.recordDelete(key));
                }
            } while (cursor !== 0);
            this.logger.debug(`Deleted ${deletedCount} keys matching pattern: ${pattern}`);
            return deletedCount;
        }
        catch (error) {
            this.statsService.recordError('delPattern', pattern);
            this.logger.warn(`Cache delPattern error for "${pattern}": ${error.message}`);
            this.redisAvailable = false;
            return 0;
        }
    }
    async reset() {
        try {
            if (this.redisClient && this.redisAvailable) {
                await this.redisClient.flushDb();
            }
            this.logger.warn('Cache reset: all cache cleared');
        }
        catch (error) {
            this.logger.warn(`Cache reset error: ${error.message}`);
            this.redisAvailable = false;
        }
    }
    async getOrSet(key, factory, ttl) {
        const cached = await this.get(key);
        if (cached !== undefined) {
            return cached;
        }
        const existingPromise = singleFlightMap.get(key);
        if (existingPromise) {
            this.logger.debug(`Single flight: waiting for existing request for key: ${key}`);
            return existingPromise;
        }
        const promise = (async () => {
            try {
                const value = await factory();
                if (value === null || value === undefined) {
                    await this.set(key, { __NULL: true }, cache_constants_1.CacheTTL.SHORT);
                }
                else {
                    await this.set(key, value, ttl);
                }
                return value;
            }
            finally {
                singleFlightMap.delete(key);
            }
        })();
        singleFlightMap.set(key, promise);
        return promise;
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
        if (this.redisClient && this.redisAvailable) {
            try {
                const pipeline = this.redisClient.multi();
                for (const { key, value, ttl } of entries) {
                    const serialized = JSON.stringify(value);
                    if (ttl) {
                        pipeline.setEx(key, ttl, serialized);
                    }
                    else {
                        pipeline.set(key, serialized);
                    }
                }
                await pipeline.exec();
                entries.forEach(({ key }) => this.statsService.recordSet(key));
                return;
            }
            catch (error) {
                this.logger.warn(`Redis pipeline failed, falling back to individual sets: ${error.message}`);
                this.redisAvailable = false;
            }
        }
        await Promise.all(entries.map(({ key, value, ttl }) => this.set(key, value, ttl)));
    }
    async getMany(keys) {
        const result = new Map();
        if (this.redisClient && this.redisAvailable && keys.length > 0) {
            try {
                const values = await this.redisClient.mGet(keys);
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];
                    const value = values[i];
                    if (value !== null) {
                        try {
                            result.set(key, JSON.parse(value));
                            this.statsService.recordHit(key);
                        }
                        catch {
                            this.statsService.recordMiss(key);
                        }
                    }
                    else {
                        this.statsService.recordMiss(key);
                    }
                }
                return result;
            }
            catch (error) {
                this.logger.warn(`Redis mget failed, falling back to individual gets: ${error.message}`);
                this.redisAvailable = false;
            }
        }
        const results = await Promise.all(keys.map(async (key) => ({
            key,
            value: await this.get(key),
        })));
        for (const { key, value } of results) {
            if (value !== undefined) {
                result.set(key, value);
            }
        }
        return result;
    }
    async delMany(keys) {
        if (this.redisClient && this.redisAvailable && keys.length > 0) {
            try {
                const deletedCount = await this.redisClient.del(keys);
                keys.forEach(key => this.statsService.recordDelete(key));
                return deletedCount;
            }
            catch (error) {
                this.logger.warn(`Redis del failed, falling back to individual deletes: ${error.message}`);
                this.redisAvailable = false;
            }
        }
        await Promise.all(keys.map(key => this.del(key)));
        return keys.length;
    }
    async exists(key) {
        if (this.redisClient && this.redisAvailable) {
            try {
                const result = await this.redisClient.exists(key);
                return result > 0;
            }
            catch (error) {
                this.logger.warn(`Redis exists failed, falling back to get: ${error.message}`);
                this.redisAvailable = false;
            }
        }
        const value = await this.get(key);
        return value !== undefined;
    }
    async setNX(key, value, ttl) {
        if (this.redisClient && this.redisAvailable) {
            try {
                const result = await this.redisClient.set(key, JSON.stringify(value), {
                    NX: true,
                    EX: ttl,
                });
                return result === 'OK';
            }
            catch (error) {
                this.logger.warn(`Redis setNX failed, falling back to check-and-set: ${error.message}`);
                this.redisAvailable = false;
            }
        }
        const exists = await this.exists(key);
        if (!exists) {
            await this.set(key, value, ttl);
            return true;
        }
        return false;
    }
    async getStats() {
        return this.statsService.getSummary();
    }
    async getMetrics() {
        return this.statsService.getMetrics();
    }
    logCacheHit(pattern, hit) {
        if (hit) {
            this.logger.debug(`Cache HIT: ${pattern}`);
        }
        else {
            this.logger.debug(`Cache MISS: ${pattern}`);
        }
    }
    async ping() {
        if (this.redisClient && this.redisAvailable) {
            try {
                const result = await this.redisClient.ping();
                return result === 'PONG';
            }
            catch (error) {
                this.logger.warn(`Redis ping failed: ${error.message}`);
                this.redisAvailable = false;
                return false;
            }
        }
        return false;
    }
    isRedisAvailable() {
        return this.redisAvailable;
    }
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = CacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [cache_manager_1.Cache,
        cache_stats_service_1.CacheStatsService])
], CacheService);
//# sourceMappingURL=cache.service.js.map
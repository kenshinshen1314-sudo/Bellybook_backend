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
var RankingCacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RankingCacheService = exports.RankingCacheTTL = void 0;
const common_1 = require("@nestjs/common");
const cache_service_1 = require("../../cache/cache.service");
exports.RankingCacheTTL = {
    STATS: cache_service_1.CacheTTL.MEDIUM,
    LEADERBOARD: cache_service_1.CacheTTL.MEDIUM,
    CUISINE_MASTERS: cache_service_1.CacheTTL.MEDIUM,
    GOURMETS: cache_service_1.CacheTTL.MEDIUM,
    DISH_EXPERTS: cache_service_1.CacheTTL.MEDIUM,
    USER_DETAILS: cache_service_1.CacheTTL.SHORT,
};
let RankingCacheService = RankingCacheService_1 = class RankingCacheService {
    cacheService;
    logger = new common_1.Logger(RankingCacheService_1.name);
    constructor(cacheService) {
        this.cacheService = cacheService;
    }
    async get(key) {
        const value = await this.cacheService.getWithPrefix(cache_service_1.CachePrefix.RANKING, key);
        return value ?? null;
    }
    async set(key, data, ttl = exports.RankingCacheTTL.LEADERBOARD) {
        await this.cacheService.setWithPrefix(cache_service_1.CachePrefix.RANKING, key, data, ttl);
    }
    async delete(key) {
        await this.cacheService.delWithPrefix(cache_service_1.CachePrefix.RANKING, key);
    }
    async clearExpired() {
        this.logger.debug('Redis automatically handles expired cache cleanup');
    }
    async clearAll() {
        await this.cacheService.reset();
        this.logger.log('Cleared all ranking cache');
    }
    async clearPeriod(period) {
        await this.cacheService.delPattern(`${cache_service_1.CachePrefix.RANKING}:*:${period}`);
        this.logger.log(`Cleared ranking cache for period: ${period}`);
    }
    async warmup(keysAndValues) {
        await this.cacheService.setMany(keysAndValues.map(({ key, value, ttl }) => ({
            key: `${cache_service_1.CachePrefix.RANKING}:${key}`,
            value,
            ttl: ttl ?? exports.RankingCacheTTL.LEADERBOARD,
        })));
        this.logger.log(`Cache warmup completed: ${keysAndValues.length} entries`);
    }
    async getStats() {
        return {
            prefix: cache_service_1.CachePrefix.RANKING,
            note: 'Redis cache stats require direct Redis client connection',
        };
    }
};
exports.RankingCacheService = RankingCacheService;
exports.RankingCacheService = RankingCacheService = RankingCacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cache_service_1.CacheService])
], RankingCacheService);
//# sourceMappingURL=ranking-cache.service.js.map
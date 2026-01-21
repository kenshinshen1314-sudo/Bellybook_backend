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
var RankingOptimizedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RankingOptimizedService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const cuisine_masters_query_1 = require("./queries/cuisine-masters.query");
const leaderboard_query_1 = require("./queries/leaderboard.query");
const gourmets_query_1 = require("./queries/gourmets.query");
const dish_experts_query_1 = require("./queries/dish-experts.query");
const user_details_query_1 = require("./queries/user-details.query");
const stats_query_1 = require("./queries/stats.query");
const ranking_cache_service_1 = require("./cache/ranking-cache.service");
const cache_key_util_1 = require("./cache/cache-key.util");
let RankingOptimizedService = RankingOptimizedService_1 = class RankingOptimizedService {
    cuisineMastersQuery;
    leaderboardQuery;
    gourmetsQuery;
    dishExpertsQuery;
    userDetailsQuery;
    statsQuery;
    cacheService;
    logger = new common_1.Logger(RankingOptimizedService_1.name);
    constructor(cuisineMastersQuery, leaderboardQuery, gourmetsQuery, dishExpertsQuery, userDetailsQuery, statsQuery, cacheService) {
        this.cuisineMastersQuery = cuisineMastersQuery;
        this.leaderboardQuery = leaderboardQuery;
        this.gourmetsQuery = gourmetsQuery;
        this.dishExpertsQuery = dishExpertsQuery;
        this.userDetailsQuery = userDetailsQuery;
        this.statsQuery = statsQuery;
        this.cacheService = cacheService;
    }
    async getCuisineMasters(cuisineName, period = client_1.RankingPeriod.ALL_TIME) {
        const cacheKey = cache_key_util_1.CacheKeyUtil.cuisineMasters(period, cuisineName);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
        const result = await this.cuisineMastersQuery.execute(cuisineName, period);
        await this.cacheService.set(cacheKey, result);
        return result;
    }
    async getLeaderboard(period = client_1.RankingPeriod.ALL_TIME, tier) {
        const cacheKey = cache_key_util_1.CacheKeyUtil.leaderboard(period, tier);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
        const result = await this.leaderboardQuery.execute(period, tier);
        await this.cacheService.set(cacheKey, result);
        return result;
    }
    async getRankingStats(period = client_1.RankingPeriod.ALL_TIME) {
        const cacheKey = cache_key_util_1.CacheKeyUtil.stats(period);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
        const result = await this.statsQuery.execute(period);
        await this.cacheService.set(cacheKey, result);
        return result;
    }
    async getGourmets(period = client_1.RankingPeriod.ALL_TIME) {
        const cacheKey = cache_key_util_1.CacheKeyUtil.gourmets(period);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
        const result = await this.gourmetsQuery.execute(period);
        await this.cacheService.set(cacheKey, result);
        return result;
    }
    async getDishExperts(period = client_1.RankingPeriod.ALL_TIME) {
        const cacheKey = cache_key_util_1.CacheKeyUtil.dishExperts(period);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
        const result = await this.dishExpertsQuery.execute(period);
        await this.cacheService.set(cacheKey, result);
        return result;
    }
    async getCuisineExpertDetail(userId, cuisineName, period = client_1.RankingPeriod.ALL_TIME) {
        return this.userDetailsQuery.getCuisineExpertDetail(userId, cuisineName, period);
    }
    async getAllUsersDishes(period = client_1.RankingPeriod.WEEKLY) {
        return this.userDetailsQuery.getAllUsersDishes(period);
    }
    async getUserUnlockedDishes(userId) {
        return this.userDetailsQuery.getUserUnlockedDishes(userId);
    }
    async clearExpiredCache() {
        await this.cacheService.clearExpired();
    }
    async clearAllCache() {
        await this.cacheService.clearAll();
    }
};
exports.RankingOptimizedService = RankingOptimizedService;
exports.RankingOptimizedService = RankingOptimizedService = RankingOptimizedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cuisine_masters_query_1.CuisineMastersQuery,
        leaderboard_query_1.LeaderboardQuery,
        gourmets_query_1.GourmetsQuery,
        dish_experts_query_1.DishExpertsQuery,
        user_details_query_1.UserDetailsQuery,
        stats_query_1.StatsQuery,
        ranking_cache_service_1.RankingCacheService])
], RankingOptimizedService);
//# sourceMappingURL=ranking-optimized.service.js.map
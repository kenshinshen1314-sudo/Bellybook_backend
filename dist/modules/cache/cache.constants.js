"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheMetrics = exports.CachePrefix = exports.CacheTTL = void 0;
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
    MEAL: 'meal',
    DISH_UNLOCKS: 'dish:unlocks',
    CUISINE_UNLOCKS: 'cuisine:unlocks',
    DAILY_NUTRITION: 'daily:nutrition',
};
exports.CacheMetrics = {
    HIT: 'cache_hit',
    MISS: 'cache_miss',
    SET: 'cache_set',
    DELETE: 'cache_delete',
    ERROR: 'cache_error',
};
//# sourceMappingURL=cache.constants.js.map
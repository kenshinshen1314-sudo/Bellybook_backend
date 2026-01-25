export declare const CacheTTL: {
    readonly SHORT: 60;
    readonly MEDIUM: 300;
    readonly LONG: 1800;
    readonly VERY_LONG: 3600;
    readonly DAILY: 86400;
};
export declare const CachePrefix: {
    readonly USER: "user";
    readonly USER_PROFILE: "user:profile";
    readonly USER_SETTINGS: "user:settings";
    readonly RANKING: "ranking";
    readonly CUISINE_CONFIGS: "cuisine:configs";
    readonly DISH_INFO: "dish:info";
    readonly AI_ANALYSIS: "ai:analysis";
    readonly MEAL: "meal";
    readonly DISH_UNLOCKS: "dish:unlocks";
    readonly CUISINE_UNLOCKS: "cuisine:unlocks";
    readonly DAILY_NUTRITION: "daily:nutrition";
};
export declare const CacheMetrics: {
    readonly HIT: "cache_hit";
    readonly MISS: "cache_miss";
    readonly SET: "cache_set";
    readonly DELETE: "cache_delete";
    readonly ERROR: "cache_error";
};

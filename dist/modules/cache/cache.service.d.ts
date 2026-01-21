import { Cache } from '@nestjs/cache-manager';
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
};
export declare class CacheService {
    private cacheManager;
    private readonly logger;
    constructor(cacheManager: Cache);
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    del(key: string): Promise<void>;
    delPattern(pattern: string): Promise<void>;
    reset(): Promise<void>;
    getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
    getWithPrefix<T>(prefix: string, key: string): Promise<T | undefined>;
    setWithPrefix<T>(prefix: string, key: string, value: T, ttl?: number): Promise<void>;
    delWithPrefix(prefix: string, key: string): Promise<void>;
    setMany(entries: Array<{
        key: string;
        value: unknown;
        ttl?: number;
    }>): Promise<void>;
    getMany<T>(keys: string[]): Promise<Array<{
        key: string;
        value: T | undefined;
    }>>;
    logCacheHit(pattern: string, hit: boolean): void;
}

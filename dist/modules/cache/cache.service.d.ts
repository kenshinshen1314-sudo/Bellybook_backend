import { Cache } from '@nestjs/cache-manager';
import { CacheStatsService } from './cache-stats.service';
import { CachePrefix } from './cache.constants';
export declare class CacheService {
    private cacheManager;
    private readonly statsService;
    private readonly logger;
    private redisClient;
    private redisAvailable;
    private redisInitAttempted;
    constructor(cacheManager: Cache, statsService: CacheStatsService);
    private initRedisClient;
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    del(key: string): Promise<void>;
    delPattern(pattern: string): Promise<number>;
    reset(): Promise<void>;
    getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
    getWithPrefix<T>(prefix: keyof typeof CachePrefix, key: string): Promise<T | undefined>;
    setWithPrefix<T>(prefix: keyof typeof CachePrefix, key: string, value: T, ttl?: number): Promise<void>;
    delWithPrefix(prefix: keyof typeof CachePrefix, key: string): Promise<void>;
    setMany(entries: Array<{
        key: string;
        value: unknown;
        ttl?: number;
    }>): Promise<void>;
    getMany<T>(keys: string[]): Promise<Map<string, T>>;
    delMany(keys: string[]): Promise<number>;
    exists(key: string): Promise<boolean>;
    setNX(key: string, value: unknown, ttl: number): Promise<boolean>;
    getStats(): Promise<{
        hits: number;
        misses: number;
        hitRate: number;
        sets: number;
        deletes: number;
        errors: number;
    }>;
    getMetrics(): Promise<string>;
    logCacheHit(pattern: string, hit: boolean): void;
    ping(): Promise<boolean>;
    isRedisAvailable(): boolean;
}

import { CacheService } from '../../cache/cache.service';
export declare const RankingCacheTTL: {
    readonly STATS: 300;
    readonly LEADERBOARD: 300;
    readonly CUISINE_MASTERS: 300;
    readonly GOURMETS: 300;
    readonly DISH_EXPERTS: 300;
    readonly USER_DETAILS: 60;
};
export declare class RankingCacheService {
    private readonly cacheService;
    private readonly logger;
    constructor(cacheService: CacheService);
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, data: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clearExpired(): Promise<void>;
    clearAll(): Promise<void>;
    clearPeriod(period: string): Promise<void>;
    warmup(keysAndValues: Array<{
        key: string;
        value: unknown;
        ttl?: number;
    }>): Promise<void>;
    getStats(): Promise<{
        prefix: string;
        note: string;
    }>;
}

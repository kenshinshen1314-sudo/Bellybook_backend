import { CacheService } from './cache.service';
import { CacheStatsService } from './cache-stats.service';
import { CachePrefix } from './cache.constants';
export declare const CACHE_KEY_METADATA = "cache:key";
export declare const CACHE_TTL_METADATA = "cache:ttl";
export declare function generateCacheKey(prefix: string, args: Record<string, unknown>): string;
export declare function Cacheable(prefix: string | keyof typeof CachePrefix, paramNames?: string[], ttl?: number): <T extends {
    cacheService?: CacheService;
    cacheStatsService?: CacheStatsService;
}>(target: T, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function CacheInvalidate(prefix: string | keyof typeof CachePrefix, paramNames?: string[], pattern?: string | null): <T extends {
    cacheService?: CacheService;
    cacheStatsService?: CacheStatsService;
}>(target: T, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function CachePut(prefix: string | keyof typeof CachePrefix, paramNames?: string[], ttl?: number): <T extends {
    cacheService?: CacheService;
    cacheStatsService?: CacheStatsService;
}>(target: T, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function CacheWarmup(keys: Array<{
    key: string;
    factory: string;
}>): (target: new (...args: unknown[]) => object) => void;

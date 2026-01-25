import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
export declare const CACHE_TTL_METADATA = "cache_ttl";
export declare const NO_CACHE_METADATA = "no_cache";
interface CacheOptions {
    ttl?: number;
    mustRevalidate?: boolean;
    noCache?: boolean;
    noStore?: boolean;
}
export declare class CacheInterceptor implements NestInterceptor {
    private readonly reflector;
    constructor(reflector: Reflector);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private generateETag;
}
export declare function Cache(ttl: number, options?: Partial<CacheOptions>): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare function NoCache(): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare const CacheTTL: {
    readonly MINUTE: 60;
    readonly FIVE_MINUTES: 300;
    readonly FIFTEEN_MINUTES: 900;
    readonly HALF_HOUR: 1800;
    readonly HOUR: 3600;
    readonly SIX_HOURS: 21600;
    readonly DAY: 86400;
    readonly WEEK: 604800;
};
export {};

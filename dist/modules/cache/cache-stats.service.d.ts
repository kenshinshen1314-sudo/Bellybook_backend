export declare class CacheStatsService {
    private readonly logger;
    private hitsCounter;
    private missesCounter;
    private setCounter;
    private deleteCounter;
    private errorCounter;
    private getDuration;
    private setDuration;
    private cacheSize;
    constructor();
    recordHit(key: string): void;
    recordMiss(key: string): void;
    recordSet(key: string): void;
    recordDelete(key: string): void;
    recordError(operation: string, key: string): void;
    recordGetDuration(key: string, duration: number): void;
    recordSetDuration(key: string, duration: number): void;
    getHitRate(): Promise<number>;
    getMetrics(): Promise<string>;
    getSummary(): Promise<{
        hits: number;
        misses: number;
        hitRate: number;
        sets: number;
        deletes: number;
        errors: number;
    }>;
    reset(): void;
    private extractPrefix;
}

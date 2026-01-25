import { PrismaService } from '../../database/prisma.service';
import { CuisineConfigDto, CuisineUnlockDto, CuisineStatsDto, CuisineDetailDto, CuisineDetailStatsDto } from './dto/cuisine-response.dto';
import { CacheService } from '../cache/cache.service';
import { CacheStatsService } from '../cache/cache-stats.service';
export declare class CuisinesService {
    private prisma;
    cacheService: CacheService;
    cacheStatsService: CacheStatsService;
    constructor(prisma: PrismaService, cacheService: CacheService, cacheStatsService: CacheStatsService);
    findAll(): Promise<CuisineConfigDto[]>;
    findUnlocked(userId: string): Promise<CuisineUnlockDto[]>;
    getStats(userId: string): Promise<CuisineStatsDto>;
    findOne(userId: string, name: string): Promise<CuisineDetailDto>;
    getCuisineStats(userId: string, name: string): Promise<CuisineDetailStatsDto>;
    private mapToCuisineConfig;
    private mapToCuisineUnlock;
    private average;
}

import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CacheStatsService } from '../cache/cache-stats.service';
import { CuisineMastersDto, LeaderboardDto, RankingStatsDto, GourmetsDto, DishExpertsDto, CuisineExpertDetailDto, AllUsersDishesDto, UserUnlockedDishesDto } from './dto/ranking-response.dto';
import { RankingPeriod } from './dto/ranking-query.dto';
export declare class RankingService {
    private prisma;
    cacheService: CacheService;
    cacheStatsService: CacheStatsService;
    private readonly logger;
    constructor(prisma: PrismaService, cacheService: CacheService, cacheStatsService: CacheStatsService);
    getCuisineMasters(cuisineName?: string, period?: RankingPeriod): Promise<CuisineMastersDto>;
    getLeaderboard(period?: RankingPeriod, tier?: string): Promise<LeaderboardDto>;
    getRankingStats(period?: RankingPeriod): Promise<RankingStatsDto>;
    getGourmets(period?: RankingPeriod): Promise<GourmetsDto>;
    getDishExperts(period?: RankingPeriod): Promise<DishExpertsDto>;
    private getDateRange;
    getCuisineExpertDetail(userId: string, cuisineName: string, period?: RankingPeriod): Promise<CuisineExpertDetailDto>;
    getAllUsersDishes(period?: RankingPeriod): Promise<AllUsersDishesDto>;
    getUserUnlockedDishes(userId: string): Promise<UserUnlockedDishesDto>;
}

import { PrismaService } from '../../database/prisma.service';
import { RankingPeriod } from '@prisma/client';
import { CuisineMastersDto, LeaderboardDto, RankingStatsDto, GourmetsDto, DishExpertsDto, CuisineExpertDetailDto, AllUsersDishesDto, UserUnlockedDishesDto } from './dto/ranking-response.dto';
export declare class RankingOptimizedService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getCuisineMasters(cuisineName?: string, period?: RankingPeriod): Promise<CuisineMastersDto>;
    getLeaderboard(period?: RankingPeriod, tier?: string): Promise<LeaderboardDto>;
    getRankingStats(period?: RankingPeriod): Promise<RankingStatsDto>;
    getGourmets(period?: RankingPeriod): Promise<GourmetsDto>;
    getDishExperts(period?: RankingPeriod): Promise<DishExpertsDto>;
    private buildMealWhere;
    private getUserMap;
    private getDateRange;
    private buildCacheKey;
    private getCache;
    private setCache;
    getCuisineExpertDetail(userId: string, cuisineName: string, period?: RankingPeriod): Promise<CuisineExpertDetailDto>;
    getAllUsersDishes(period?: RankingPeriod): Promise<AllUsersDishesDto>;
    getUserUnlockedDishes(userId: string): Promise<UserUnlockedDishesDto>;
}

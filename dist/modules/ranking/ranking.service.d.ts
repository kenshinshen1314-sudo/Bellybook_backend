import { PrismaService } from '../../database/prisma.service';
import { CuisineMastersDto, LeaderboardDto, RankingStatsDto, GourmetsDto, DishExpertsDto, CuisineExpertDetailDto, AllUsersDishesDto, UserUnlockedDishesDto } from './dto/ranking-response.dto';
import { RankingPeriod } from './dto/ranking-query.dto';
export declare class RankingService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
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

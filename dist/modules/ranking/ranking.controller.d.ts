import { RankingOptimizedService } from './ranking-optimized.service';
import { RankingPeriod } from './dto/ranking-query.dto';
import { CuisineMastersDto, LeaderboardDto, RankingStatsDto, GourmetsDto, DishExpertsDto, CuisineExpertDetailDto, AllUsersDishesDto, UserUnlockedDishesDto } from './dto/ranking-response.dto';
export declare class RankingController {
    private readonly rankingService;
    constructor(rankingService: RankingOptimizedService);
    getCuisineMasters(cuisineName?: string, period?: RankingPeriod): Promise<CuisineMastersDto>;
    getLeaderboard(period?: RankingPeriod, tier?: string): Promise<LeaderboardDto>;
    getRankingStats(period?: RankingPeriod): Promise<RankingStatsDto>;
    getGourmets(period?: RankingPeriod): Promise<GourmetsDto>;
    getDishExperts(period?: RankingPeriod): Promise<DishExpertsDto>;
    getCuisineExpertDetail(userId: string, cuisineName: string, period?: RankingPeriod, limit?: number, offset?: number): Promise<CuisineExpertDetailDto>;
    getAllUsersDishes(period?: RankingPeriod): Promise<AllUsersDishesDto>;
    getUserUnlockedDishes(userId: string, limit?: number, offset?: number): Promise<UserUnlockedDishesDto>;
}

import { RankingService } from './ranking.service';
import { RankingPeriod } from './dto/ranking-query.dto';
import { CuisineMastersDto, LeaderboardDto, RankingStatsDto, GourmetsDto, DishExpertsDto } from './dto/ranking-response.dto';
export declare class RankingController {
    private readonly rankingService;
    constructor(rankingService: RankingService);
    getCuisineMasters(cuisineName?: string, period?: RankingPeriod): Promise<CuisineMastersDto>;
    getLeaderboard(period?: RankingPeriod, tier?: string): Promise<LeaderboardDto>;
    getRankingStats(period?: RankingPeriod): Promise<RankingStatsDto>;
    getGourmets(period?: RankingPeriod): Promise<GourmetsDto>;
    getDishExperts(period?: RankingPeriod): Promise<DishExpertsDto>;
}

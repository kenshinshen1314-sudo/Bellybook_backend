import { RankingPeriod } from '@prisma/client';
export declare enum CacheKeyType {
    CUISINE_MASTERS = "cuisine_masters",
    LEADERBOARD = "leaderboard",
    STATS = "stats",
    GOURMETS = "gourmets",
    DISH_EXPERTS = "dish_experts"
}
export declare class CacheKeyUtil {
    static build(type: CacheKeyType, period: RankingPeriod, suffix?: string | undefined): string;
    static cuisineMasters(period: RankingPeriod, cuisineName?: string): string;
    static leaderboard(period: RankingPeriod, tier?: string): string;
    static stats(period: RankingPeriod): string;
    static gourmets(period: RankingPeriod): string;
    static dishExperts(period: RankingPeriod): string;
}

export declare enum RankingPeriod {
    WEEKLY = "WEEKLY",
    MONTHLY = "MONTHLY",
    YEARLY = "YEARLY",
    ALL_TIME = "ALL_TIME"
}
export declare class CuisineMastersQueryDto {
    cuisineName?: string;
    period?: RankingPeriod;
}
export declare class LeaderboardQueryDto {
    period?: RankingPeriod;
    tier?: 'FREE' | 'PREMIUM' | 'PRO';
}
export declare class PaginatedQueryDto {
    limit?: number;
    offset?: number;
}

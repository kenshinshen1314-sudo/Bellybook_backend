import { PrismaService } from '../../../database/prisma.service';
import { RankingPeriod } from '@prisma/client';
import { LeaderboardDto } from '../dto/ranking-response.dto';
export declare class LeaderboardQuery {
    private prisma;
    constructor(prisma: PrismaService);
    execute(period: RankingPeriod, tier: string | undefined): Promise<LeaderboardDto>;
    private buildMealWhere;
    private getUserMap;
    private getDateRange;
}

import { PrismaService } from '../../../database/prisma.service';
import { RankingPeriod } from '@prisma/client';
import { RankingStatsDto } from '../dto/ranking-response.dto';
export declare class StatsQuery {
    private prisma;
    constructor(prisma: PrismaService);
    execute(period: RankingPeriod): Promise<RankingStatsDto>;
    private getDateRangeSql;
}

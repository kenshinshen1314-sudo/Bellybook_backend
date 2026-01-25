import { PrismaService } from '../../../database/prisma.service';
import { RankingPeriod } from '@prisma/client';
import { GourmetsDto } from '../dto/ranking-response.dto';
export declare class GourmetsQuery {
    private prisma;
    constructor(prisma: PrismaService);
    execute(period: RankingPeriod): Promise<GourmetsDto>;
    private getDateRangeSql;
}

import { PrismaService } from '../../../database/prisma.service';
import { RankingPeriod } from '@prisma/client';
import { DishExpertsDto } from '../dto/ranking-response.dto';
export declare class DishExpertsQuery {
    private prisma;
    constructor(prisma: PrismaService);
    execute(period: RankingPeriod): Promise<DishExpertsDto>;
    private getDateRangeSql;
}

import { PrismaService } from '../../../database/prisma.service';
import { RankingPeriod } from '@prisma/client';
import { CuisineMastersDto } from '../dto/ranking-response.dto';
export declare class CuisineMastersQuery {
    private prisma;
    constructor(prisma: PrismaService);
    execute(cuisineName: string | undefined, period: RankingPeriod): Promise<CuisineMastersDto>;
    private getDateRangeSql;
}

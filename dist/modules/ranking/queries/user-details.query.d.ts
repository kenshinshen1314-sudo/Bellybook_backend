import { PrismaService } from '../../../database/prisma.service';
import { RankingPeriod } from '@prisma/client';
import { CuisineExpertDetailDto, AllUsersDishesDto, UserUnlockedDishesDto } from '../dto/ranking-response.dto';
export declare class UserDetailsQuery {
    private prisma;
    constructor(prisma: PrismaService);
    getCuisineExpertDetail(userId: string, cuisineName: string, period: RankingPeriod, limit?: number, offset?: number): Promise<CuisineExpertDetailDto>;
    getAllUsersDishes(period: RankingPeriod): Promise<AllUsersDishesDto>;
    getUserUnlockedDishes(userId: string, limit?: number, offset?: number): Promise<UserUnlockedDishesDto>;
    private getDateRangeSql;
}

import { PrismaService } from '../../database/prisma.service';
import { CuisineConfigDto, CuisineUnlockDto, CuisineStatsDto, CuisineDetailDto } from './dto/cuisine-response.dto';
export declare class CuisinesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<CuisineConfigDto[]>;
    findUnlocked(userId: string): Promise<CuisineUnlockDto[]>;
    getStats(userId: string): Promise<CuisineStatsDto>;
    findOne(userId: string, name: string): Promise<CuisineDetailDto>;
    private mapToCuisineConfig;
    private mapToCuisineUnlock;
    private average;
}

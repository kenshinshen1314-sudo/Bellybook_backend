import { CuisinesService } from './cuisines.service';
import { CuisineConfigDto, CuisineUnlockDto, CuisineStatsDto, CuisineDetailDto, CuisineDetailStatsDto } from './dto/cuisine-response.dto';
export declare class CuisinesController {
    private readonly cuisinesService;
    constructor(cuisinesService: CuisinesService);
    findAll(): Promise<CuisineConfigDto[]>;
    findUnlocked(userId: string): Promise<CuisineUnlockDto[]>;
    getStats(userId: string): Promise<CuisineStatsDto>;
    findOne(userId: string, name: string): Promise<CuisineDetailDto>;
    getCuisineStats(userId: string, name: string): Promise<CuisineDetailStatsDto>;
}

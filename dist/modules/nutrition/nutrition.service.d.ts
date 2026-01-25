import { PrismaService } from '../../database/prisma.service';
import { DailyNutritionDto, WeeklyTrendsDto, NutritionSummaryDto, AverageNutritionDto } from './dto/nutrition-response.dto';
import { CacheService } from '../cache/cache.service';
export interface SimpleMealResponse {
    id: string;
    userId: string;
    imageUrl: string;
    thumbnailUrl?: string;
    analysis: unknown;
    mealType: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    isSynced: boolean;
    version: number;
}
export declare class NutritionService {
    private prisma;
    private cacheService;
    constructor(prisma: PrismaService, cacheService: CacheService);
    getDaily(userId: string, date?: Date): Promise<DailyNutritionDto>;
    getWeekly(userId: string, startDate?: Date, endDate?: Date): Promise<WeeklyTrendsDto>;
    getSummary(userId: string, period?: 'week' | 'month' | 'year' | 'all'): Promise<NutritionSummaryDto>;
    getAverages(userId: string, period?: 'day' | 'week' | 'month' | 'year'): Promise<AverageNutritionDto>;
    private sum;
    private mapToMealResponse;
}

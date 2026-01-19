import { PrismaService } from '../../database/prisma.service';
import { DailyNutritionDto, WeeklyTrendsDto, NutritionSummaryDto, AverageNutritionDto } from './dto/nutrition-response.dto';
export declare class NutritionService {
    private prisma;
    constructor(prisma: PrismaService);
    getDaily(userId: string, date?: Date): Promise<DailyNutritionDto>;
    getWeekly(userId: string, startDate?: Date, endDate?: Date): Promise<WeeklyTrendsDto>;
    getSummary(userId: string, period?: 'week' | 'month' | 'year' | 'all'): Promise<NutritionSummaryDto>;
    getAverages(userId: string, period?: 'day' | 'week' | 'month' | 'year'): Promise<AverageNutritionDto>;
    private sum;
    private mapToMealResponse;
}

import { NutritionService } from './nutrition.service';
import { DailyNutritionDto, WeeklyTrendsDto, NutritionSummaryDto, AverageNutritionDto } from './dto/nutrition-response.dto';
export declare class NutritionController {
    private readonly nutritionService;
    constructor(nutritionService: NutritionService);
    getDaily(userId: string, dateStr?: string): Promise<DailyNutritionDto>;
    getWeekly(userId: string, startDateStr?: string, endDateStr?: string): Promise<WeeklyTrendsDto>;
    getSummary(userId: string, period?: 'week' | 'month' | 'year' | 'all'): Promise<NutritionSummaryDto>;
    getAverages(userId: string, period?: 'day' | 'week' | 'month' | 'year'): Promise<AverageNutritionDto>;
}

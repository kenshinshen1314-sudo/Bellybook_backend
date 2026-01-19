import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { NutritionService } from './nutrition.service';
import { DailyNutritionDto, WeeklyTrendsDto, NutritionSummaryDto, AverageNutritionDto } from './dto/nutrition-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('nutrition')
@UseGuards(JwtAuthGuard)
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Get('daily')
  async getDaily(
    @CurrentUser('userId') userId: string,
    @Query('date') dateStr?: string,
  ): Promise<DailyNutritionDto> {
    const date = dateStr ? new Date(dateStr) : undefined;
    return this.nutritionService.getDaily(userId, date);
  }

  @Get('weekly')
  async getWeekly(
    @CurrentUser('userId') userId: string,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ): Promise<WeeklyTrendsDto> {
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;
    return this.nutritionService.getWeekly(userId, startDate, endDate);
  }

  @Get('summary')
  async getSummary(
    @CurrentUser('userId') userId: string,
    @Query('period') period: 'week' | 'month' | 'year' | 'all' = 'week',
  ): Promise<NutritionSummaryDto> {
    return this.nutritionService.getSummary(userId, period);
  }

  @Get('averages')
  async getAverages(
    @CurrentUser('userId') userId: string,
    @Query('period') period: 'day' | 'week' | 'month' | 'year' = 'week',
  ): Promise<AverageNutritionDto> {
    return this.nutritionService.getAverages(userId, period);
  }
}

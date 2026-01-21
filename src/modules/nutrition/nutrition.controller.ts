import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NutritionService } from './nutrition.service';
import { DailyNutritionDto, WeeklyTrendsDto, NutritionSummaryDto, AverageNutritionDto } from './dto/nutrition-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Nutrition')
@ApiBearerAuth('bearer')
@Controller('nutrition')
@UseGuards(JwtAuthGuard)
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Get('daily')
  @ApiOperation({
    summary: '获取每日营养数据',
    description: '获取指定日期的营养摄入数据，包括卡路里、蛋白质、碳水化合物、脂肪等',
  })
  @ApiQuery({
    name: 'date',
    description: '日期 (YYYY-MM-DD 格式，不传则返回今天的数据)',
    required: false,
    example: '2024-01-15',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: DailyNutritionDto,
  })
  async getDaily(
    @CurrentUser('userId') userId: string,
    @Query('date') dateStr?: string,
  ): Promise<DailyNutritionDto> {
    const date = dateStr ? new Date(dateStr) : undefined;
    return this.nutritionService.getDaily(userId, date);
  }

  @Get('weekly')
  @ApiOperation({
    summary: '获取营养趋势',
    description: '获取指定时间范围内的营养摄入趋势数据',
  })
  @ApiQuery({
    name: 'startDate',
    description: '开始日期 (YYYY-MM-DD 格式，不传则使用最近7天)',
    required: false,
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    description: '结束日期 (YYYY-MM-DD 格式)',
    required: false,
    example: '2024-01-07',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: WeeklyTrendsDto,
  })
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
  @ApiOperation({
    summary: '获取营养汇总',
    description: '获取指定时间段内的营养摄入汇总统计',
  })
  @ApiQuery({
    name: 'period',
    description: '统计周期',
    required: false,
    enum: ['week', 'month', 'year', 'all'],
    example: 'week',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: NutritionSummaryDto,
  })
  async getSummary(
    @CurrentUser('userId') userId: string,
    @Query('period') period: 'week' | 'month' | 'year' | 'all' = 'week',
  ): Promise<NutritionSummaryDto> {
    return this.nutritionService.getSummary(userId, period);
  }

  @Get('averages')
  @ApiOperation({
    summary: '获取平均营养摄入',
    description: '获取指定周期内的平均营养摄入数据',
  })
  @ApiQuery({
    name: 'period',
    description: '统计周期',
    required: false,
    enum: ['day', 'week', 'month', 'year'],
    example: 'week',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: AverageNutritionDto,
  })
  async getAverages(
    @CurrentUser('userId') userId: string,
    @Query('period') period: 'day' | 'week' | 'month' | 'year' = 'week',
  ): Promise<AverageNutritionDto> {
    return this.nutritionService.getAverages(userId, period);
  }
}

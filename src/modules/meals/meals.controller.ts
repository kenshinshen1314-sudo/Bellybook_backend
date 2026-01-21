import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { MealsService } from './meals.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { MealResponseDto, PaginatedMealsDto } from './dto/meal-response.dto';
import { MealQueryDto } from './dto/meal-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SuccessResponse } from '../../common/dto/response.dto';

@ApiTags('Meals')
@ApiBearerAuth('bearer')
@Controller('meals')
@UseGuards(JwtAuthGuard)
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Get()
  @ApiOperation({
    summary: '获取餐食列表',
    description: '获取当前用户的餐食列表，支持分页和筛选',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: PaginatedMealsDto,
  })
  async findAll(
    @CurrentUser('userId') userId: string,
    @Query() query: MealQueryDto,
  ): Promise<PaginatedMealsDto> {
    return this.mealsService.findAll(userId, query);
  }

  @Get('today')
  @ApiOperation({
    summary: '获取今日餐食',
    description: '获取当前用户今天的所有餐食记录',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: [MealResponseDto],
  })
  async getToday(@CurrentUser('userId') userId: string): Promise<MealResponseDto[]> {
    return this.mealsService.getToday(userId);
  }

  @Get('by-date')
  @ApiOperation({
    summary: '按日期获取餐食',
    description: '获取指定日期的所有餐食记录',
  })
  @ApiQuery({
    name: 'date',
    description: '日期 (YYYY-MM-DD 格式)',
    example: '2024-01-15',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: [MealResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: '日期格式错误',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid date format',
        code: 'BAD_REQUEST',
      },
    },
  })
  async getByDate(
    @CurrentUser('userId') userId: string,
    @Query('date') dateStr: string,
  ): Promise<MealResponseDto[]> {
    const date = new Date(dateStr);
    return this.mealsService.getByDate(userId, date);
  }

  @Get('by-dish/:dishName')
  @ApiOperation({
    summary: '按菜品名获取餐食',
    description: '获取指定菜品名称的所有餐食记录',
  })
  @ApiParam({
    name: 'dishName',
    description: '菜品名称 (URL 编码)',
    example: '宫保鸡丁',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: [MealResponseDto],
  })
  async getByDishName(
    @CurrentUser('userId') userId: string,
    @Param('dishName') dishName: string,
  ) {
    return this.mealsService.getByDishName(userId, decodeURIComponent(dishName));
  }

  @Get(':id')
  @ApiOperation({
    summary: '获取单个餐食',
    description: '根据 ID 获取指定餐食的详细信息',
  })
  @ApiParam({
    name: 'id',
    description: '餐食 ID',
    example: 'cm1234567890',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: MealResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '餐食不存在',
    schema: {
      example: {
        statusCode: 404,
        message: 'Meal not found',
        code: 'NOT_FOUND',
      },
    },
  })
  async findOne(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<MealResponseDto> {
    return this.mealsService.findOne(userId, id);
  }

  @Post()
  @ApiOperation({
    summary: '创建餐食',
    description: '创建新的餐食记录',
  })
  @ApiResponse({
    status: 201,
    description: '创建成功',
    type: MealResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
    schema: {
      example: {
        statusCode: 400,
        message: 'Bad Request',
        code: 'BAD_REQUEST',
      },
    },
  })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateMealDto,
  ): Promise<MealResponseDto> {
    return this.mealsService.create(userId, dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: '更新餐食',
    description: '更新指定餐食的信息',
  })
  @ApiParam({
    name: 'id',
    description: '餐食 ID',
    example: 'cm1234567890',
  })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    type: MealResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '餐食不存在',
    schema: {
      example: {
        statusCode: 404,
        message: 'Meal not found',
        code: 'NOT_FOUND',
      },
    },
  })
  async update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMealDto,
  ): Promise<MealResponseDto> {
    return this.mealsService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '删除餐食',
    description: '删除指定的餐食记录',
  })
  @ApiParam({
    name: 'id',
    description: '餐食 ID',
    example: 'cm1234567890',
  })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    type: SuccessResponse,
  })
  @ApiResponse({
    status: 404,
    description: '餐食不存在',
    schema: {
      example: {
        statusCode: 404,
        message: 'Meal not found',
        code: 'NOT_FOUND',
      },
    },
  })
  async remove(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<SuccessResponse> {
    await this.mealsService.remove(userId, id);
    return new SuccessResponse(null, 'Meal deleted successfully');
  }
}

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
import { MealsService } from './meals.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { MealResponseDto, PaginatedMealsDto } from './dto/meal-response.dto';
import { MealQueryDto } from './dto/meal-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SuccessResponse } from '../../common/dto/response.dto';

@Controller('meals')
@UseGuards(JwtAuthGuard)
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Get()
  async findAll(
    @CurrentUser('userId') userId: string,
    @Query() query: MealQueryDto,
  ): Promise<PaginatedMealsDto> {
    return this.mealsService.findAll(userId, query);
  }

  @Get('today')
  async getToday(@CurrentUser('userId') userId: string): Promise<MealResponseDto[]> {
    return this.mealsService.getToday(userId);
  }

  @Get('by-date')
  async getByDate(
    @CurrentUser('userId') userId: string,
    @Query('date') dateStr: string,
  ): Promise<MealResponseDto[]> {
    const date = new Date(dateStr);
    return this.mealsService.getByDate(userId, date);
  }

  @Get('by-dish/:dishName')
  async getByDishName(
    @CurrentUser('userId') userId: string,
    @Param('dishName') dishName: string,
  ) {
    return this.mealsService.getByDishName(userId, decodeURIComponent(dishName));
  }

  @Get(':id')
  async findOne(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<MealResponseDto> {
    return this.mealsService.findOne(userId, id);
  }

  @Post()
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateMealDto,
  ): Promise<MealResponseDto> {
    return this.mealsService.create(userId, dto);
  }

  @Put(':id')
  async update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMealDto,
  ): Promise<MealResponseDto> {
    return this.mealsService.update(userId, id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<SuccessResponse> {
    await this.mealsService.remove(userId, id);
    return new SuccessResponse(null, 'Meal deleted successfully');
  }
}

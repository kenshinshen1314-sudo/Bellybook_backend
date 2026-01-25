import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RankingOptimizedService } from './ranking-optimized.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CuisineMastersQueryDto, LeaderboardQueryDto, RankingPeriod, PaginatedQueryDto } from './dto/ranking-query.dto';
import { CuisineMastersDto, LeaderboardDto, RankingStatsDto, GourmetsDto, DishExpertsDto, CuisineExpertDetailDto, AllUsersDishesDto, UserUnlockedDishesDto } from './dto/ranking-response.dto';
import { Cache, CacheTTL } from '../../common/interceptors/cache.interceptor';

@ApiTags('Ranking')
@ApiBearerAuth('bearer')
@Controller('ranking')
@UseGuards(JwtAuthGuard)
export class RankingController {
  constructor(private readonly rankingService: RankingOptimizedService) {}

  /**
   * 获取菜系专家榜
   * Query Params:
   * - cuisineName: 菜系名称（可选，不传则返回所有菜系的排行）
   * - period: 时间段 (WEEKLY, MONTHLY, YEARLY, ALL_TIME)
   *
   * GET /api/v1/ranking/cuisine-masters
   * GET /api/v1/ranking/cuisine-masters?cuisineName=川菜
   * GET /api/v1/ranking/cuisine-masters?cuisineName=川菜&period=WEEKLY
   */
  @Get('cuisine-masters')
  @ApiOperation({
    summary: '获取菜系专家榜',
    description: '获取各菜系的专家排行榜，可按菜系名称和时间段筛选',
  })
  @ApiQuery({
    name: 'cuisineName',
    description: '菜系名称（可选，不传则返回所有菜系的排行）',
    required: false,
    example: '川菜',
  })
  @ApiQuery({
    name: 'period',
    description: '时间段',
    required: false,
    enum: ['WEEKLY', 'MONTHLY', 'YEARLY', 'ALL_TIME'],
    example: 'ALL_TIME',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: CuisineMastersDto,
  })
  @Cache(CacheTTL.FIVE_MINUTES) // 排行榜数据，缓存5分钟
  async getCuisineMasters(
    @Query('cuisineName') cuisineName?: string,
    @Query('period') period: RankingPeriod = RankingPeriod.ALL_TIME,
  ): Promise<CuisineMastersDto> {
    return this.rankingService.getCuisineMasters(cuisineName, period);
  }

  /**
   * 获取综合排行榜
   * Query Params:
   * - period: 时间段 (WEEKLY, MONTHLY, YEARLY, ALL_TIME)
   * - tier: 会员等级 (FREE, PREMIUM, PRO)
   *
   * GET /api/v1/ranking/leaderboard
   * GET /api/v1/ranking/leaderboard?period=WEEKLY
   * GET /api/v1/ranking/leaderboard?period=WEEKLY&tier=FREE
   */
  @Get('leaderboard')
  @ApiOperation({
    summary: '获取综合排行榜',
    description: '获取用户综合排行榜，基于餐食数量和菜系数量计算得分',
  })
  @ApiQuery({
    name: 'period',
    description: '时间段',
    required: false,
    enum: ['WEEKLY', 'MONTHLY', 'YEARLY', 'ALL_TIME'],
    example: 'ALL_TIME',
  })
  @ApiQuery({
    name: 'tier',
    description: '会员等级筛选（可选）',
    required: false,
    enum: ['FREE', 'PREMIUM', 'PRO'],
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: LeaderboardDto,
  })
  @Cache(CacheTTL.FIVE_MINUTES) // 排行榜数据，缓存5分钟
  async getLeaderboard(
    @Query('period') period: RankingPeriod = RankingPeriod.ALL_TIME,
    @Query('tier') tier?: string,
  ): Promise<LeaderboardDto> {
    return this.rankingService.getLeaderboard(period, tier);
  }

  /**
   * 获取排行榜统计数据
   * Query Params:
   * - period: 时间段 (WEEKLY, MONTHLY, YEARLY, ALL_TIME)
   *
   * GET /api/v1/ranking/stats
   * GET /api/v1/ranking/stats?period=WEEKLY
   */
  @Get('stats')
  @ApiOperation({
    summary: '获取排行榜统计数据',
    description: '获取排行榜的统计数据，包括活跃用户数、总餐食数等',
  })
  @ApiQuery({
    name: 'period',
    description: '时间段',
    required: false,
    enum: ['WEEKLY', 'MONTHLY', 'YEARLY', 'ALL_TIME'],
    example: 'ALL_TIME',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: RankingStatsDto,
  })
  @Cache(CacheTTL.FIVE_MINUTES) // 排行榜统计数据，缓存5分钟
  async getRankingStats(
    @Query('period') period: RankingPeriod = RankingPeriod.ALL_TIME,
  ): Promise<RankingStatsDto> {
    return this.rankingService.getRankingStats(period);
  }

  /**
   * 获取美食家榜
   * 统计每个用户的去重后菜系数量，倒序展示
   * Query Params:
   * - period: 时间段 (WEEKLY, MONTHLY, YEARLY, ALL_TIME)
   *
   * GET /api/v1/ranking/gourmets
   * GET /api/v1/ranking/gourmets?period=WEEKLY
   */
  @Get('gourmets')
  @ApiOperation({
    summary: '获取美食家榜',
    description: '统计每个用户尝试过的去重菜系数量，按数量倒序排列',
  })
  @ApiQuery({
    name: 'period',
    description: '时间段',
    required: false,
    enum: ['WEEKLY', 'MONTHLY', 'YEARLY', 'ALL_TIME'],
    example: 'ALL_TIME',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: GourmetsDto,
  })
  @Cache(CacheTTL.FIVE_MINUTES) // 排行榜数据，缓存5分钟
  async getGourmets(
    @Query('period') period: RankingPeriod = RankingPeriod.ALL_TIME,
  ): Promise<GourmetsDto> {
    return this.rankingService.getGourmets(period);
  }

  /**
   * 获取菜品专家榜
   * 统计每个用户的去重后菜品数量，倒序展示
   * Query Params:
   * - period: 时间段 (WEEKLY, MONTHLY, YEARLY, ALL_TIME)
   *
   * GET /api/v1/ranking/dish-experts
   * GET /api/v1/ranking/dish-experts?period=WEEKLY
   */
  @Get('dish-experts')
  @ApiOperation({
    summary: '获取菜品专家榜',
    description: '统计每个用户解锁的去重菜品数量，按数量倒序排列',
  })
  @ApiQuery({
    name: 'period',
    description: '时间段',
    required: false,
    enum: ['WEEKLY', 'MONTHLY', 'YEARLY', 'ALL_TIME'],
    example: 'ALL_TIME',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: DishExpertsDto,
  })
  @Cache(CacheTTL.FIVE_MINUTES) // 排行榜数据，缓存5分钟
  async getDishExperts(
    @Query('period') period: RankingPeriod = RankingPeriod.ALL_TIME,
  ): Promise<DishExpertsDto> {
    return this.rankingService.getDishExperts(period);
  }

  /**
   * 获取菜系专家详情
   * 展示指定用户在指定菜系下的所有菜品
   * Query Params:
   * - userId: 用户ID (必需)
   * - cuisineName: 菜系名称 (必需)
   * - period: 时间段 (WEEKLY, MONTHLY, YEARLY, ALL_TIME)
   *
   * GET /api/v1/ranking/cuisine-expert-detail?userId=xxx&cuisineName=川菜&period=ALL_TIME
   */
  @Get('cuisine-expert-detail')
  @ApiOperation({
    summary: '获取菜系专家详情',
    description: '展示指定用户在指定菜系下的所有菜品记录（支持分页）',
  })
  @ApiQuery({
    name: 'userId',
    description: '用户 ID',
    required: true,
    example: 'cm1234567890',
  })
  @ApiQuery({
    name: 'cuisineName',
    description: '菜系名称',
    required: true,
    example: '川菜',
  })
  @ApiQuery({
    name: 'period',
    description: '时间段',
    required: false,
    enum: ['WEEKLY', 'MONTHLY', 'YEARLY', 'ALL_TIME'],
    example: 'ALL_TIME',
  })
  @ApiQuery({
    name: 'limit',
    description: '每页条目数（1-100）',
    required: false,
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    description: '偏移量',
    required: false,
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: CuisineExpertDetailDto,
  })
  @ApiResponse({
    status: 400,
    description: '缺少必需参数',
    schema: {
      example: {
        statusCode: 400,
        message: 'userId and cuisineName are required',
        code: 'BAD_REQUEST',
      },
    },
  })
  async getCuisineExpertDetail(
    @Query('userId') userId: string,
    @Query('cuisineName') cuisineName: string,
    @Query('period') period: RankingPeriod = RankingPeriod.ALL_TIME,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<CuisineExpertDetailDto> {
    // 应用默认值和限制
    const validatedLimit = Math.min(Math.max(limit || 50, 1), 100);
    const validatedOffset = Math.max(offset || 0, 0);
    return this.rankingService.getCuisineExpertDetail(userId, cuisineName, period, validatedLimit, validatedOffset);
  }

  /**
   * 获取所有用户的菜品清单
   * 按用户分组，显示每个用户的所有菜品
   * Query Params:
   * - period: 时间段 (WEEKLY, MONTHLY, YEARLY, ALL_TIME)，默认为 WEEKLY
   *
   * GET /api/v1/ranking/all-users-dishes
   * GET /api/v1/ranking/all-users-dishes?period=WEEKLY
   */
  @Get('all-users-dishes')
  @ApiOperation({
    summary: '获取所有用户的菜品清单',
    description: '按用户分组，显示每个用户的所有菜品记录',
  })
  @ApiQuery({
    name: 'period',
    description: '时间段',
    required: false,
    enum: ['WEEKLY', 'MONTHLY', 'YEARLY', 'ALL_TIME'],
    example: 'WEEKLY',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: AllUsersDishesDto,
  })
  async getAllUsersDishes(
    @Query('period') period: RankingPeriod = RankingPeriod.WEEKLY,
  ): Promise<AllUsersDishesDto> {
    return this.rankingService.getAllUsersDishes(period);
  }

  /**
   * 获取用户已解锁的菜肴
   * 展示用户所有已解锁的菜肴列表
   * Query Params:
   * - userId: 用户ID (必需)
   *
   * GET /api/v1/ranking/user-unlocked-dishes?userId=xxx
   */
  @Get('user-unlocked-dishes')
  @ApiOperation({
    summary: '获取用户已解锁的菜肴',
    description: '展示用户所有已解锁的菜肴列表（支持分页）',
  })
  @ApiQuery({
    name: 'userId',
    description: '用户 ID',
    required: true,
    example: 'cm1234567890',
  })
  @ApiQuery({
    name: 'limit',
    description: '每页条目数（1-100）',
    required: false,
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    description: '偏移量',
    required: false,
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: UserUnlockedDishesDto,
  })
  @ApiResponse({
    status: 400,
    description: '缺少必需参数',
    schema: {
      example: {
        statusCode: 400,
        message: 'userId is required',
        code: 'BAD_REQUEST',
      },
    },
  })
  async getUserUnlockedDishes(
    @Query('userId') userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<UserUnlockedDishesDto> {
    // 应用默认值和限制
    const validatedLimit = Math.min(Math.max(limit || 50, 1), 100);
    const validatedOffset = Math.max(offset || 0, 0);
    return this.rankingService.getUserUnlockedDishes(userId, validatedLimit, validatedOffset);
  }
}

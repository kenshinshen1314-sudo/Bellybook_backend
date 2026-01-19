import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RankingService } from './ranking.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CuisineMastersQueryDto, LeaderboardQueryDto, RankingPeriod } from './dto/ranking-query.dto';
import { CuisineMastersDto, LeaderboardDto, RankingStatsDto, GourmetsDto, DishExpertsDto } from './dto/ranking-response.dto';

@Controller('ranking')
@UseGuards(JwtAuthGuard)
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

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
  async getDishExperts(
    @Query('period') period: RankingPeriod = RankingPeriod.ALL_TIME,
  ): Promise<DishExpertsDto> {
    return this.rankingService.getDishExperts(period);
  }
}

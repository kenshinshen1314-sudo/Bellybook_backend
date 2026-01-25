import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CuisinesService } from './cuisines.service';
import { CuisineConfigDto, CuisineUnlockDto, CuisineStatsDto, CuisineDetailDto, CuisineDetailStatsDto } from './dto/cuisine-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Cache, CacheTTL } from '../../common/interceptors/cache.interceptor';
import { SkipUnifiedResponse } from '../../common/interceptors/unified-response.interceptor';

@ApiTags('Cuisines')
@Controller('cuisines')
export class CuisinesController {
  constructor(private readonly cuisinesService: CuisinesService) {}

  @Public()
  @Get()
  @SkipUnifiedResponse()
  @ApiOperation({
    summary: '获取所有菜系列表',
    description: '获取所有可用的菜系配置信息（公开接口，无需认证）',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: [CuisineConfigDto],
  })
  @Cache(CacheTTL.DAY) // 菜系列表静态数据，缓存1天
  async findAll(): Promise<CuisineConfigDto[]> {
    return this.cuisinesService.findAll();
  }

  @Get('unlocked')
  @SkipUnifiedResponse()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: '获取用户已解锁的菜系',
    description: '获取当前用户已解锁的所有菜系列表',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: [CuisineUnlockDto],
  })
  @ApiResponse({
    status: 401,
    description: '未认证',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      },
    },
  })
  @Cache(CacheTTL.FIFTEEN_MINUTES) // 用户已解锁菜系，缓存15分钟
  async findUnlocked(@CurrentUser('userId') userId: string): Promise<CuisineUnlockDto[]> {
    return this.cuisinesService.findUnlocked(userId);
  }

  @Get('stats')
  @SkipUnifiedResponse()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: '获取用户菜系统计',
    description: '获取当前用户的菜系统计数据，包括已解锁数量、总数量等',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: CuisineStatsDto,
  })
  @ApiResponse({
    status: 401,
    description: '未认证',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      },
    },
  })
  @Cache(CacheTTL.FIVE_MINUTES) // 菜系统计数据，缓存5分钟
  async getStats(@CurrentUser('userId') userId: string): Promise<CuisineStatsDto> {
    return this.cuisinesService.getStats(userId);
  }

  @Get(':name')
  @SkipUnifiedResponse()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: '获取菜系详情',
    description: '获取指定菜系的详细信息，包括解锁状态和相关餐食',
  })
  @ApiParam({
    name: 'name',
    description: '菜系名称',
    example: '川菜',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: CuisineDetailDto,
  })
  @ApiResponse({
    status: 404,
    description: '菜系不存在',
    schema: {
      example: {
        statusCode: 404,
        message: 'Cuisine not found',
        code: 'NOT_FOUND',
      },
    },
  })
  @Cache(CacheTTL.HALF_HOUR) // 菜系详情，缓存30分钟
  async findOne(
    @CurrentUser('userId') userId: string,
    @Param('name') name: string,
  ): Promise<CuisineDetailDto> {
    return this.cuisinesService.findOne(userId, name);
  }

  @Get(':name/stats')
  @SkipUnifiedResponse()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: '获取菜系统计详情',
    description: '获取指定菜系的统计数据，包括唯一菜品数量、总卡路里等',
  })
  @ApiParam({
    name: 'name',
    description: '菜系名称',
    example: '川菜',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: CuisineDetailStatsDto,
  })
  @ApiResponse({
    status: 404,
    description: '菜系不存在',
    schema: {
      example: {
        statusCode: 404,
        message: 'Cuisine not found',
        code: 'NOT_FOUND',
      },
    },
  })
  @Cache(CacheTTL.HALF_HOUR) // 菜系统计详情，缓存30分钟
  async getCuisineStats(
    @CurrentUser('userId') userId: string,
    @Param('name') name: string,
  ): Promise<CuisineDetailStatsDto> {
    return this.cuisinesService.getCuisineStats(userId, name);
  }
}

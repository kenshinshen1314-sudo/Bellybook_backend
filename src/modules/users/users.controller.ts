import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ProfileResponseDto, SettingsResponseDto, UserStatsDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SuccessResponse } from '../../common/dto/response.dto';

@ApiTags('Users')
@ApiBearerAuth('bearer')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({
    summary: '获取用户资料',
    description: '获取当前登录用户的详细资料信息',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: ProfileResponseDto,
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
  async getProfile(@CurrentUser('userId') userId: string): Promise<ProfileResponseDto> {
    return this.usersService.getProfile(userId);
  }

  @Put('profile')
  @ApiOperation({
    summary: '更新用户资料',
    description: '更新当前登录用户的资料信息',
  })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    type: ProfileResponseDto,
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
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('settings')
  @ApiOperation({
    summary: '获取用户设置',
    description: '获取当前登录用户的设置信息',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: SettingsResponseDto,
  })
  async getSettings(@CurrentUser('userId') userId: string): Promise<SettingsResponseDto> {
    return this.usersService.getSettings(userId);
  }

  @Put('settings')
  @ApiOperation({
    summary: '更新用户设置',
    description: '更新当前登录用户的设置信息',
  })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    type: SettingsResponseDto,
  })
  async updateSettings(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateSettingsDto,
  ): Promise<SettingsResponseDto> {
    return this.usersService.updateSettings(userId, dto);
  }

  @Get('stats')
  @ApiOperation({
    summary: '获取用户统计数据',
    description: '获取当前登录用户的餐饮统计数据，包括餐食数量、解锁菜系等',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: UserStatsDto,
  })
  async getStats(@CurrentUser('userId') userId: string): Promise<UserStatsDto> {
    return this.usersService.getStats(userId);
  }

  @Delete('account')
  @ApiOperation({
    summary: '删除用户账号',
    description: '永久删除当前用户账号及其所有数据，此操作不可恢复',
  })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    type: SuccessResponse,
  })
  async deleteAccount(@CurrentUser('userId') userId: string): Promise<SuccessResponse> {
    await this.usersService.deleteAccount(userId);
    return new SuccessResponse(null, 'Account deleted successfully');
  }
}

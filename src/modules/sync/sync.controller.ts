import { Controller, Get, Post, Delete, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { SyncPullResponseDto, SyncPushRequestDto, SyncPushResponseDto, SyncStatusResponseDto } from './dto/sync.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SuccessResponse } from '../../common/dto/response.dto';

@ApiTags('Sync')
@ApiBearerAuth('bearer')
@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('pull')
  @ApiOperation({
    summary: '拉取同步数据',
    description: '从服务器拉取用户的数据变更，支持增量同步',
  })
  @ApiQuery({
    name: 'lastSyncAt',
    description: '上次同步时间（可选，不传则返回所有数据）',
    required: false,
    example: '2024-01-15T10:30:00.000Z',
  })
  @ApiResponse({
    status: 200,
    description: '拉取成功',
    type: SyncPullResponseDto,
  })
  async pull(
    @CurrentUser('userId') userId: string,
    @Query('lastSyncAt') lastSyncAtStr?: string,
  ): Promise<SyncPullResponseDto> {
    const lastSyncAt = lastSyncAtStr ? new Date(lastSyncAtStr) : undefined;
    return this.syncService.pull(userId, lastSyncAt);
  }

  @Post('push')
  @ApiOperation({
    summary: '推送同步数据',
    description: '将客户端的本地数据变更推送到服务器',
  })
  @ApiResponse({
    status: 201,
    description: '推送成功',
    type: SyncPushResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求数据格式错误',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid sync data',
        code: 'BAD_REQUEST',
      },
    },
  })
  async push(
    @CurrentUser('userId') userId: string,
    @Body() dto: SyncPushRequestDto,
  ): Promise<SyncPushResponseDto> {
    return this.syncService.push(userId, dto);
  }

  @Get('status')
  @ApiOperation({
    summary: '获取同步状态',
    description: '获取当前用户的同步状态，包括最后同步时间、待处理队列等',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: SyncStatusResponseDto,
  })
  async getStatus(@CurrentUser('userId') userId: string): Promise<SyncStatusResponseDto> {
    return this.syncService.getStatus(userId);
  }

  @Post('full')
  @ApiOperation({
    summary: '完全同步',
    description: '执行完全同步，拉取用户的所有数据',
  })
  @ApiResponse({
    status: 201,
    description: '同步成功',
    type: SyncPullResponseDto,
  })
  async fullSync(@CurrentUser('userId') userId: string): Promise<SyncPullResponseDto> {
    return this.syncService.pull(userId);
  }

  @Delete('queue')
  @ApiOperation({
    summary: '清空同步队列',
    description: '清空当前用户的同步队列，删除所有待处理的同步任务',
  })
  @ApiResponse({
    status: 200,
    description: '清空成功',
    type: SuccessResponse,
  })
  async clearQueue(@CurrentUser('userId') userId: string): Promise<SuccessResponse> {
    await this.syncService.clearQueue(userId);
    return new SuccessResponse(null, 'Sync queue cleared');
  }
}

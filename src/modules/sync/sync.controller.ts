import { Controller, Get, Post, Delete, Query, Body, UseGuards } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncPullResponseDto, SyncPushRequestDto, SyncPushResponseDto, SyncStatusResponseDto } from './dto/sync.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SuccessResponse } from '../../common/dto/response.dto';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('pull')
  async pull(
    @CurrentUser('userId') userId: string,
    @Query('lastSyncAt') lastSyncAtStr?: string,
  ): Promise<SyncPullResponseDto> {
    const lastSyncAt = lastSyncAtStr ? new Date(lastSyncAtStr) : undefined;
    return this.syncService.pull(userId, lastSyncAt);
  }

  @Post('push')
  async push(
    @CurrentUser('userId') userId: string,
    @Body() dto: SyncPushRequestDto,
  ): Promise<SyncPushResponseDto> {
    return this.syncService.push(userId, dto);
  }

  @Get('status')
  async getStatus(@CurrentUser('userId') userId: string): Promise<SyncStatusResponseDto> {
    return this.syncService.getStatus(userId);
  }

  @Post('full')
  async fullSync(@CurrentUser('userId') userId: string): Promise<SyncPullResponseDto> {
    return this.syncService.pull(userId);
  }

  @Delete('queue')
  async clearQueue(@CurrentUser('userId') userId: string): Promise<SuccessResponse> {
    await this.syncService.clearQueue(userId);
    return new SuccessResponse(null, 'Sync queue cleared');
  }
}

/**
 * [QUEUE CONTROLLER]
 * 队列管理接口 - 查看队列状态、管理任务
 *
 * 仅管理员可访问
 */
import { Controller, Get, Post, Delete, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { QueueService, QueueStats } from './bull-queue.service';
import type { QueueName } from './queue.constants';
import { QUEUE_NAMES } from './queue.constants';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('Queue')
@ApiBearerAuth('bearer')
@Controller('admin/queue')
@UseGuards(JwtAuthGuard, AdminGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  /**
   * 获取所有队列统计
   */
  @Get('stats')
  @ApiOperation({
    summary: '获取队列统计',
    description: '获取所有队列的统计数据（等待、活跃、完成、失败任务数）',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: 'object',
    schema: {
      example: {
        queues: [
          {
            queueName: 'ai-analysis',
            waiting: 5,
            active: 2,
            completed: 150,
            failed: 3,
            delayed: 0,
            paused: false,
          },
        ],
      },
    },
  })
  async getQueueStats(): Promise<{ queues: QueueStats[] }> {
    const queues = await this.queueService.getAllQueueStats();
    return { queues };
  }

  /**
   * 清空队列
   */
  @Delete(':queueName/clear')
  @ApiOperation({
    summary: '清空队列',
    description: '清空指定队列的所有等待和活跃任务',
  })
  @ApiResponse({
    status: 200,
    description: '清空成功',
    schema: {
      example: {
        message: 'Queue ai-analysis cleared',
        queueName: 'ai-analysis',
      },
    },
  })
  async clearQueue(@Param('queueName') queueName: QueueName): Promise<{ message: string; queueName: string }> {
    await this.queueService.clearQueue(queueName);
    return {
      message: `Queue ${queueName} cleared`,
      queueName,
    };
  }

  /**
   * 暂停队列
   */
  @Post(':queueName/pause')
  @ApiOperation({
    summary: '暂停队列',
    description: '暂停指定队列，停止处理新任务',
  })
  @ApiResponse({
    status: 200,
    description: '暂停成功',
    schema: {
      example: {
        message: 'Queue ai-analysis paused',
        queueName: 'ai-analysis',
      },
    },
  })
  async pauseQueue(@Param('queueName') queueName: QueueName): Promise<{ message: string; queueName: string }> {
    await this.queueService.pauseQueue(queueName);
    return {
      message: `Queue ${queueName} paused`,
      queueName,
    };
  }

  /**
   * 恢复队列
   */
  @Post(':queueName/resume')
  @ApiOperation({
    summary: '恢复队列',
    description: '恢复指定队列，继续处理任务',
  })
  @ApiResponse({
    status: 200,
    description: '恢复成功',
    schema: {
      example: {
        message: 'Queue ai-analysis resumed',
        queueName: 'ai-analysis',
      },
    },
  })
  async resumeQueue(@Param('queueName') queueName: QueueName): Promise<{ message: string; queueName: string }> {
    await this.queueService.resumeQueue(queueName);
    return {
      message: `Queue ${queueName} resumed`,
      queueName,
    };
  }

  /**
   * 重试失败任务
   */
  @Post(':queueName/retry')
  @ApiOperation({
    summary: '重试失败任务',
    description: '重试指定队列中的失败任务',
  })
  @ApiResponse({
    status: 200,
    description: '重试成功',
    schema: {
      example: {
        message: 'Retried 5 failed jobs',
        queueName: 'ai-analysis',
        retried: 5,
      },
    },
  })
  async retryFailedJobs(
    @Param('queueName') queueName: QueueName,
    @Param('limit', ParseIntPipe) limit: number = 100,
  ): Promise<{ message: string; queueName: string; retried: number }> {
    const retried = await this.queueService.retryFailedJobs(queueName, limit);
    return {
      message: `Retried ${retried} failed jobs`,
      queueName,
      retried,
    };
  }

  /**
   * 添加清理任务
   */
  @Post('cleanup')
  @ApiOperation({
    summary: '添加清理任务',
    description: '添加一个清理任务到队列中',
  })
  @ApiResponse({
    status: 200,
    description: '任务已添加',
    schema: {
      example: {
        message: 'Cleanup job added',
        jobId: 'cleanup-123',
      },
    },
  })
  async addCleanupJob(): Promise<{ message: string; jobId: string }> {
    const jobId = await this.queueService.addCleanupJob({ type: 'old_logs' });
    return {
      message: 'Cleanup job added',
      jobId,
    };
  }

  /**
   * 添加定时清理任务
   */
  @Post('cleanup/recurring')
  @ApiOperation({
    summary: '添加定时清理任务',
    description: '添加每天定时执行的清理任务',
  })
  @ApiResponse({
    status: 200,
    description: '定时任务已添加',
    schema: {
      example: {
        message: 'Recurring cleanup job scheduled at 2:00',
        hour: 2,
        minute: 0,
      },
    },
  })
  async addRecurringCleanupJob(
    @Param('hour', ParseIntPipe) hour: number = 2,
    @Param('minute', ParseIntPipe) minute: number = 0,
  ): Promise<{ message: string; hour: number; minute: number }> {
    await this.queueService.addRecurringCleanupJob(hour, minute);
    return {
      message: `Recurring cleanup job scheduled at ${hour}:${minute}`,
      hour,
      minute,
    };
  }
}

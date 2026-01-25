/**
 * [INPUT]: 依赖 StorageService 的文件存储、AiService 的 AI 分析、MealsService 的餐食管理、UsersService 的用户配额、AiQueueService 的异步队列
 * [OUTPUT]: 对外提供文件上传、带 AI 分析的上传（同步/异步）、文件删除、预签名 URL、任务状态查询
 * [POS]: storage 模块的控制器层，处理 HTTP 请求
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [OPTIMIZATION NOTES]
 * - 新增异步 AI 分析接口，避免长时间阻塞 HTTP 请求
 * - 客户端上传后立即返回 jobId，可轮询任务状态
 * - 同步接口保留用于兼容性
 */
import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { AiService } from '../ai/ai.service';
import { MealsService } from '../meals/meals.service';
import { UsersService } from '../users/users.service';
import { AiQueueService } from '../queue/ai-queue.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SuccessResponse } from '../../common/dto/response.dto';

@ApiTags('Storage')
@ApiBearerAuth('bearer')
@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly aiService: AiService,
    private readonly mealsService: MealsService,
    private readonly usersService: UsersService,
    private readonly aiQueueService: AiQueueService,
  ) {}

  /**
   * 上传图片
   */
  @Post('upload')
  @ApiOperation({
    summary: '上传图片',
    description: '上传图片到 Supabase Storage，返回图片 URL 和缩略图 URL',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '上传成功',
    schema: {
      example: {
        url: 'https://xxx.supabase.co/storage/v1/object/public/meal-images/xxx.jpg',
        thumbnailUrl: 'https://xxx.supabase.co/storage/v1/object/public/meal-images/thumbnails/xxx.jpg',
        path: 'user-id/xxx.jpg',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '文件格式或大小不符合要求',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid file type or size exceeds limit',
        code: 'BAD_REQUEST',
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.storageService.uploadImage(userId, file);
  }

  /**
   * 上传图片并使用 AI 进行食物分析（异步 - 推荐）
   * 立即返回 jobId，客户端可轮询任务状态
   */
  @Post('upload-with-analysis-async')
  @ApiOperation({
    summary: '上传图片并 AI 分析（异步）',
    description: '上传图片并异步进行 AI 食物分析，立即返回任务 ID。客户端可使用 /storage/jobs/:jobId 轮询任务状态。此接口不阻塞 HTTP 请求，推荐使用。',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '上传成功，返回任务 ID',
    schema: {
      example: {
        jobId: 'cm1234567890',
        status: 'PENDING',
        message: 'AI analysis job created successfully',
        upload: {
          url: 'https://xxx.supabase.co/storage/v1/object/public/meal-images/xxx.jpg',
          thumbnailUrl: 'https://xxx.supabase.co/storage/v1/object/public/meal-images/xxx.jpg?thumbnail=true',
          key: 'user-id/xxx.jpg',
        },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'AI 分析配额已用完',
    schema: {
      example: {
        statusCode: 429,
        message: 'Daily AI analysis quota exceeded. Limit: 10, please try again tomorrow.',
        error: 'QUOTA_EXCEEDED',
        quota: {
          limit: 10,
          remaining: 0,
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadWithAnalysisAsync(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      this.logger.log(`uploadWithAnalysisAsync called, userId: ${userId}`);

      // 0. 检查配额
      const quota = await this.usersService.checkAnalysisQuota(userId);

      if (!quota.allowed) {
        this.logger.warn(`quota exceeded for user ${userId}, limit: ${quota.limit}`);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Daily AI analysis quota exceeded. Limit: ${quota.limit}, please try again tomorrow.`,
            error: 'QUOTA_EXCEEDED',
            quota: {
              limit: quota.limit,
              remaining: quota.remaining,
            },
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // 1. 上传图片
      this.logger.debug('uploading image...');
      const uploadResult = await this.storageService.uploadImage(userId, file);
      this.logger.debug(`upload result: ${JSON.stringify(uploadResult)}`);

      // 2. 转换图片为 base64
      const imageBase64 = this.storageService.fileToBase64(file);
      this.logger.debug(`image converted to base64, length: ${imageBase64?.length}`);

      // 3. 创建异步 AI 分析任务
      this.logger.debug('creating AI analysis job...');
      const job = await this.aiQueueService.createJob({
        userId,
        imageUrl: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl,
        imageBase64,
        mealType: 'SNACK',
      });
      this.logger.debug(`AI analysis job created: ${job.jobId}`);

      // 4. 增加配额使用计数
      await this.usersService.incrementAnalysisCount(userId);

      // 5. 立即返回任务 ID
      return {
        ...job,
        upload: uploadResult,
      };
    } catch (error) {
      this.logger.error('uploadWithAnalysisAsync error:', error);
      throw error;
    }
  }

  /**
   * 查询 AI 分析任务状态
   */
  @Get('jobs/:jobId')
  @ApiOperation({
    summary: '查询 AI 分析任务状态',
    description: '根据任务 ID 查询 AI 分析的进度和结果',
  })
  @ApiParam({
    name: 'jobId',
    description: '任务 ID',
    example: 'cm1234567890',
  })
  @ApiResponse({
    status: 200,
    description: '任务详情',
    schema: {
      example: {
        id: 'cm1234567890',
        status: 'COMPLETED',
        imageUrl: 'https://xxx.supabase.co/storage/v1/object/public/meal-images/xxx.jpg',
        thumbnailUrl: 'https://xxx.supabase.co/storage/v1/object/public/meal-images/xxx.jpg?thumbnail=true',
        analysisResult: {
          dishes: [
            {
              foodName: '宫保鸡丁',
              cuisine: '川菜',
              nutrition: { calories: 320, protein: 25, fat: 18, carbohydrates: 12 },
            },
          ],
          nutrition: { calories: 320, protein: 25, fat: 18, carbohydrates: 12 },
        },
        mealId: 'cm0987654321',
        retryCount: 0,
        createdAt: '2024-01-15T10:30:00.000Z',
        startedAt: '2024-01-15T10:30:02.000Z',
        completedAt: '2024-01-15T10:30:08.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '任务不存在',
    schema: {
      example: {
        statusCode: 404,
        message: 'Job not found',
        code: 'NOT_FOUND',
      },
    },
  })
  async getJobStatus(
    @CurrentUser('userId') userId: string,
    @Param('jobId') jobId: string,
  ) {
    const job = await this.aiQueueService.getJob(jobId, userId);

    if (!job) {
      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Job not found',
          code: 'NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return job;
  }

  /**
   * 获取用户的 AI 分析任务列表
   */
  @Get('jobs')
  @ApiOperation({
    summary: '获取用户的 AI 分析任务列表',
    description: '获取当前用户的最近 AI 分析任务',
  })
  @ApiResponse({
    status: 200,
    description: '任务列表',
    schema: {
      example: {
        jobs: [
          {
            id: 'cm1234567890',
            status: 'COMPLETED',
            createdAt: '2024-01-15T10:30:00.000Z',
          },
        ],
      },
    },
  })
  async getUserJobs(
    @CurrentUser('userId') userId: string,
  ) {
    const jobs = await this.aiQueueService.getUserJobs(userId);
    return { jobs };
  }

  /**
   * 上传图片并使用 AI 进行食物分析（同步）
   * 等待 AI 分析完成后返回完整结果
   * @deprecated 建议使用异步接口 /storage/upload-with-analysis-async
   */
  @Post('upload-with-analysis')
  @ApiOperation({
    summary: '上传图片并 AI 分析',
    description: '上传图片并进行 AI 食物分析，自动创建餐食记录。注意：此接口会消耗每日 AI 分析配额',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '上传和分析成功，返回完整的餐食记录',
    schema: {
      example: {
        upload: {
          url: 'https://xxx.supabase.co/storage/v1/object/public/meal-images/xxx.jpg',
          thumbnailUrl: 'https://xxx.supabase.co/storage/v1/object/public/meal-images/thumbnails/xxx.jpg',
          path: 'user-id/xxx.jpg',
        },
        analysis: {
          dishes: [
            {
              foodName: '宫保鸡丁',
              cuisine: '川菜',
              confidence: 0.95,
              ingredients: ['鸡胸肉', '花生', '辣椒'],
              nutrition: { calories: 320, protein: 25, carbs: 12, fat: 18 },
            },
          ],
          summary: '这是一道经典的川菜，以鸡胸肉和花生为主要食材。',
        },
        meal: {
          id: 'cm1234567890',
          imageUrl: 'https://xxx.supabase.co/storage/v1/object/public/meal-images/xxx.jpg',
          mealType: 'SNACK',
          createdAt: '2024-01-15T10:30:00.000Z',
        },
        quota: {
          limit: 10,
          remaining: 9,
        },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'AI 分析配额已用完',
    schema: {
      example: {
        statusCode: 429,
        message: 'Daily AI analysis quota exceeded. Limit: 10, please try again tomorrow.',
        error: 'QUOTA_EXCEEDED',
        quota: {
          limit: 10,
          remaining: 0,
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadWithAnalysis(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      this.logger.log(`uploadWithAnalysis called, userId: ${userId}`);

      // 0. 检查配额
      const quota = await this.usersService.checkAnalysisQuota(userId);
      this.logger.debug(`quota check result: ${JSON.stringify(quota)}`);

      if (!quota.allowed) {
        this.logger.warn(`quota exceeded for user ${userId}, limit: ${quota.limit}`);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Daily AI analysis quota exceeded. Limit: ${quota.limit}, please try again tomorrow.`,
            error: 'QUOTA_EXCEEDED',
            quota: {
              limit: quota.limit,
              remaining: quota.remaining,
            },
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // 1. 上传图片
      this.logger.debug('uploading image...');
      const uploadResult = await this.storageService.uploadImage(userId, file);
      this.logger.debug(`upload result: ${JSON.stringify(uploadResult)}`);

      // 2. 转换图片为 base64 用于 AI 分析
      const imageBase64 = this.storageService.fileToBase64(file);
      this.logger.debug(`image converted to base64, length: ${imageBase64?.length}`);

      // 3. 同步执行 AI 分析（等待结果）
      this.logger.debug('starting AI analysis...');
      const analysis = await this.aiService.analyzeFoodImage(imageBase64);
      this.logger.debug(`AI analysis completed: ${analysis?.dishes?.[0]?.foodName}`);

      // 4. 增加配额使用计数
      await this.usersService.incrementAnalysisCount(userId);

      // 5. 创建完整的 meal 记录
      this.logger.debug('creating meal record...');
      const meal = await this.mealsService.create(userId, {
        imageUrl: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl,
        analysis,
        mealType: 'SNACK',
      });
      this.logger.debug(`meal created: ${meal?.id}`);

      // 6. 返回完整结果
      return {
        upload: uploadResult,
        analysis,
        meal,
        quota: {
          limit: quota.limit,
          remaining: quota.remaining - 1,
        },
      };
    } catch (error) {
      this.logger.error('uploadWithAnalysis error:', error);
      throw error;
    }
  }

  /**
   * 删除文件
   */
  @Delete('delete')
  @ApiOperation({
    summary: '删除文件',
    description: '从 Supabase Storage 删除指定文件',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: '文件存储路径',
          example: 'user-id/xxx.jpg',
        },
      },
      required: ['key'],
    },
  })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    type: SuccessResponse,
  })
  @ApiResponse({
    status: 404,
    description: '文件不存在',
    schema: {
      example: {
        statusCode: 404,
        message: 'File not found',
        code: 'NOT_FOUND',
      },
    },
  })
  async deleteFile(@Body('key') key: string): Promise<SuccessResponse> {
    await this.storageService.deleteFile(key);
    return new SuccessResponse(null, 'File deleted successfully');
  }

  /**
   * 获取预签名 URL
   */
  @Post('presigned-url')
  @ApiOperation({
    summary: '获取预签名 URL',
    description: '获取用于直接上传文件的预签名 URL，客户端可直接使用此 URL 上传文件',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: '文件名',
          example: 'photo.jpg',
        },
        type: {
          type: 'string',
          description: '文件类型',
          example: 'image/jpeg',
        },
      },
      required: ['filename', 'type'],
    },
  })
  @ApiResponse({
    status: 201,
    description: '生成成功',
    schema: {
      example: {
        url: 'https://xxx.supabase.co/storage/v1/object/sign/meal-images/xxx.jpg?token=xxx',
        path: 'user-id/xxx.jpg',
      },
    },
  })
  async getPresignedUrl(@Body('filename') filename: string, @Body('type') type: string) {
    return this.storageService.getPresignedUrl(filename, type);
  }
}

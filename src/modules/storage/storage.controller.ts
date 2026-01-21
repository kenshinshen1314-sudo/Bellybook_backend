/**
 * [INPUT]: 依赖 StorageService 的文件存储、AiService 的 AI 分析、MealsService 的餐食管理、UsersService 的用户配额
 * [OUTPUT]: 对外提供文件上传、带 AI 分析的上传、文件删除、预签名 URL
 * [POS]: storage 模块的控制器层，处理 HTTP 请求
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { AiService } from '../ai/ai.service';
import { MealsService } from '../meals/meals.service';
import { UsersService } from '../users/users.service';
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
   * 上传图片并使用 AI 进行食物分析（同步）
   * 等待 AI 分析完成后返回完整结果
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

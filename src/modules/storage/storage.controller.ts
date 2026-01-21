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
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { AiService } from '../ai/ai.service';
import { MealsService } from '../meals/meals.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SuccessResponse } from '../../common/dto/response.dto';

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
  async deleteFile(@Body('key') key: string): Promise<SuccessResponse> {
    await this.storageService.deleteFile(key);
    return new SuccessResponse(null, 'File deleted successfully');
  }

  /**
   * 获取预签名 URL
   */
  @Post('presigned-url')
  async getPresignedUrl(@Body('filename') filename: string, @Body('type') type: string) {
    return this.storageService.getPresignedUrl(filename, type);
  }
}

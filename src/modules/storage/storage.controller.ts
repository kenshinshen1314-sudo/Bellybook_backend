import { Controller, Post, Delete, Body, UseGuards, UseInterceptors, UploadedFile, HttpException, HttpStatus } from '@nestjs/common';
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
  constructor(
    private readonly storageService: StorageService,
    private readonly aiService: AiService,
    private readonly mealsService: MealsService,
    private readonly usersService: UsersService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
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
    // 0. 检查配额
    const quota = await this.usersService.checkAnalysisQuota(userId);

    if (!quota.allowed) {
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
    const uploadResult = await this.storageService.uploadImage(userId, file);

    // 2. 转换图片为 base64 用于 AI 分析
    const imageBase64 = this.storageService.fileToBase64(file);

    // 3. 同步执行 AI 分析（等待结果）
    const analysis = await this.aiService.analyzeFoodImage(imageBase64);

    // 4. 增加配额使用计数
    await this.usersService.incrementAnalysisCount(userId);

    // 5. 创建完整的 meal 记录
    const meal = await this.mealsService.create(userId, {
      imageUrl: uploadResult.url,
      thumbnailUrl: uploadResult.thumbnailUrl,
      analysis: analysis as any,
      mealType: 'SNACK',
    });

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
  }

  /**
   * 后台异步处理 AI 分析（已弃用，保留供其他功能使用）
   */
  private async processAiAnalysis(
    userId: string,
    mealId: string,
    imageBase64: string,
    uploadResult: any,
  ): Promise<void> {
    try {
      // 执行 AI 分析
      const analysis = await this.aiService.analyzeFoodImage(imageBase64);

      // 增加配额使用计数
      await this.usersService.incrementAnalysisCount(userId);

      // 更新 meal 记录
      await this.mealsService.updateWithAnalysis(mealId, {
        analysis: analysis as any,
        calories: analysis.nutrition.calories,
        protein: analysis.nutrition.protein,
        fat: analysis.nutrition.fat,
        carbohydrates: analysis.nutrition.carbohydrates,
        price: analysis.foodPrice,
        foodName: analysis.foodName,
        cuisine: analysis.cuisine,
        description: analysis.description,
        historicalOrigins: analysis.historicalOrigins,
      });

      console.log(`AI analysis completed for meal ${mealId}`);
    } catch (error) {
      // 分析失败，更新 meal 记录为失败状态
      await this.mealsService.markAnalysisFailed(mealId, {
        error: error.message,
        status: 'failed',
      });
      throw error;
    }
  }

  @Delete('delete')
  async deleteFile(@Body('key') key: string): Promise<SuccessResponse> {
    await this.storageService.deleteFile(key);
    return new SuccessResponse(null, 'File deleted successfully');
  }

  @Post('presigned-url')
  async getPresignedUrl(@Body('filename') filename: string, @Body('type') type: string): Promise<any> {
    return this.storageService.getPresignedUrl(filename, type);
  }
}

import { Injectable, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { env } from '../../config/env';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private supabase: ReturnType<typeof createClient>;
  private bucketName: string;

  async onModuleInit() {
    this.supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
    );
    this.bucketName = env.SUPABASE_STORAGE_BUCKET;

    // 确保 bucket 存在
    await this.ensureBucketExists();
  }

  private async ensureBucketExists() {
    try {
      const { data, error } = await this.supabase
        .storage
        .from(this.bucketName)
        .list('/', { limit: 1 });

      if (error) {
        this.logger.warn(`Bucket '${this.bucketName}' access check failed:`, error);
        this.logger.warn(`Please create the bucket '${this.bucketName}' in Supabase Storage console`);
      } else {
        this.logger.log(`Storage bucket '${this.bucketName}' is accessible`);
      }
    } catch (e) {
      this.logger.warn(`Could not verify bucket existence:`, e);
    }
  }

  async uploadImage(userId: string, file: Express.Multer.File): Promise<{
    url: string;
    thumbnailUrl: string;
    key: string;
    size: number;
  }> {
    this.logger.log(`uploadImage called: userId=${userId}, file=${file ? file.originalname : 'null'}, size=${file?.size}, mimetype=${file?.mimetype}`);

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.buffer) {
      this.logger.error('File buffer is empty!');
      throw new BadRequestException('File buffer is empty');
    }

    const allowedTypes = env.ALLOWED_IMAGE_TYPES.split(',');
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type. Allowed: ${env.ALLOWED_IMAGE_TYPES}`);
    }

    if (file.size > env.MAX_FILE_SIZE) {
      throw new BadRequestException(`File too large. Max size: ${env.MAX_FILE_SIZE} bytes`);
    }

    // 生成文件路径: userId/timestamp-filename
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${timestamp}-${sanitizedFilename}`;

    try {
      this.logger.log(`Starting upload to Supabase: bucket=${this.bucketName}, path=${filePath}, size=${file.size}, mimetype=${file.mimetype}`);

      // 上传到 Supabase Storage
      const { data, error } = await this.supabase
        .storage
        .from(this.bucketName)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        this.logger.error('Supabase upload error:', JSON.stringify(error));
        throw new BadRequestException(`Failed to upload file: ${error.message}`);
      }

      this.logger.log(`Supabase upload successful: path=${filePath}`);

      // 构建公开访问 URL
      const { data: { publicUrl } } = this.supabase
        .storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      this.logger.log(`File uploaded successfully: ${filePath}`);

      return {
        url: publicUrl,
        thumbnailUrl: `${publicUrl}?thumbnail=true`,
        key: filePath,
        size: file.size,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Upload error:', error);
      throw new BadRequestException('Failed to upload file to storage');
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .storage
        .from(this.bucketName)
        .remove([key]);

      if (error) {
        this.logger.error('Supabase delete error:', error);
        throw new BadRequestException(`Failed to delete file: ${error.message}`);
      }

      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Delete error:', error);
      throw new BadRequestException('Failed to delete file from storage');
    }
  }

  getPresignedUrl(filename: string, type: string): { url: string; key: string } {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `uploads/${timestamp}-${sanitizedFilename}`;

    // Supabase 使用签名 URL 而不是 presigned URL
    const signedUrl = `${env.SUPABASE_URL}/storage/v1/object/sign/${this.bucketName}/${key}`;

    return {
      url: signedUrl,
      key,
    };
  }

  /**
   * 将文件转换为 base64 格式用于 AI 分析
   */
  fileToBase64(file: Express.Multer.File): string {
    return file.buffer.toString('base64');
  }
}

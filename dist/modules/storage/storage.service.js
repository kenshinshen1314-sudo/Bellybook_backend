"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("../../config/env");
let StorageService = StorageService_1 = class StorageService {
    logger = new common_1.Logger(StorageService_1.name);
    supabase;
    bucketName;
    async onModuleInit() {
        this.supabase = (0, supabase_js_1.createClient)(env_1.env.SUPABASE_URL, env_1.env.SUPABASE_SERVICE_ROLE_KEY);
        this.bucketName = env_1.env.SUPABASE_STORAGE_BUCKET;
        await this.ensureBucketExists();
    }
    async ensureBucketExists() {
        try {
            const { data, error } = await this.supabase
                .storage
                .from(this.bucketName)
                .list('/', { limit: 1 });
            if (error) {
                this.logger.warn(`Bucket '${this.bucketName}' access check failed:`, error);
                this.logger.warn(`Please create the bucket '${this.bucketName}' in Supabase Storage console`);
            }
            else {
                this.logger.log(`Storage bucket '${this.bucketName}' is accessible`);
            }
        }
        catch (e) {
            this.logger.warn(`Could not verify bucket existence:`, e);
        }
    }
    async uploadImage(userId, file) {
        this.logger.log(`uploadImage called: userId=${userId}, file=${file ? file.originalname : 'null'}, size=${file?.size}, mimetype=${file?.mimetype}`);
        if (!file) {
            throw new common_1.BadRequestException('No file provided');
        }
        if (!file.buffer) {
            this.logger.error('File buffer is empty!');
            throw new common_1.BadRequestException('File buffer is empty');
        }
        const allowedTypes = env_1.env.ALLOWED_IMAGE_TYPES.split(',');
        if (!allowedTypes.includes(file.mimetype)) {
            throw new common_1.BadRequestException(`Invalid file type. Allowed: ${env_1.env.ALLOWED_IMAGE_TYPES}`);
        }
        if (file.size > env_1.env.MAX_FILE_SIZE) {
            throw new common_1.BadRequestException(`File too large. Max size: ${env_1.env.MAX_FILE_SIZE} bytes`);
        }
        const timestamp = Date.now();
        const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${userId}/${timestamp}-${sanitizedFilename}`;
        try {
            this.logger.log(`Starting upload to Supabase: bucket=${this.bucketName}, path=${filePath}, size=${file.size}, mimetype=${file.mimetype}`);
            const { data, error } = await this.supabase
                .storage
                .from(this.bucketName)
                .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });
            if (error) {
                this.logger.error('Supabase upload error:', JSON.stringify(error));
                throw new common_1.BadRequestException(`Failed to upload file: ${error.message}`);
            }
            this.logger.log(`Supabase upload successful: path=${filePath}`);
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
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            this.logger.error('Upload error:', error);
            throw new common_1.BadRequestException('Failed to upload file to storage');
        }
    }
    async deleteFile(key) {
        try {
            const { error } = await this.supabase
                .storage
                .from(this.bucketName)
                .remove([key]);
            if (error) {
                this.logger.error('Supabase delete error:', error);
                throw new common_1.BadRequestException(`Failed to delete file: ${error.message}`);
            }
            this.logger.log(`File deleted successfully: ${key}`);
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            this.logger.error('Delete error:', error);
            throw new common_1.BadRequestException('Failed to delete file from storage');
        }
    }
    getPresignedUrl(filename, type) {
        const timestamp = Date.now();
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const key = `uploads/${timestamp}-${sanitizedFilename}`;
        const signedUrl = `${env_1.env.SUPABASE_URL}/storage/v1/object/sign/${this.bucketName}/${key}`;
        return {
            url: signedUrl,
            key,
        };
    }
    fileToBase64(file) {
        return file.buffer.toString('base64');
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)()
], StorageService);
//# sourceMappingURL=storage.service.js.map
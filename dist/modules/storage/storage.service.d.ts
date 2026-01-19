import { OnModuleInit } from '@nestjs/common';
export declare class StorageService implements OnModuleInit {
    private readonly logger;
    private supabase;
    private bucketName;
    onModuleInit(): Promise<void>;
    private ensureBucketExists;
    uploadImage(userId: string, file: Express.Multer.File): Promise<{
        url: string;
        thumbnailUrl: string;
        key: string;
        size: number;
    }>;
    deleteFile(key: string): Promise<void>;
    getPresignedUrl(filename: string, type: string): {
        url: string;
        key: string;
    };
    fileToBase64(file: Express.Multer.File): string;
}

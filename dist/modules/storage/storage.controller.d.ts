import { StorageService } from './storage.service';
import { AiService } from '../ai/ai.service';
import { MealsService } from '../meals/meals.service';
import { UsersService } from '../users/users.service';
import { AiQueueService } from '../queue/ai-queue.service';
import { SuccessResponse } from '../../common/dto/response.dto';
export declare class StorageController {
    private readonly storageService;
    private readonly aiService;
    private readonly mealsService;
    private readonly usersService;
    private readonly aiQueueService;
    private readonly logger;
    constructor(storageService: StorageService, aiService: AiService, mealsService: MealsService, usersService: UsersService, aiQueueService: AiQueueService);
    uploadImage(userId: string, file: Express.Multer.File): Promise<{
        url: string;
        thumbnailUrl: string;
        key: string;
        size: number;
    }>;
    uploadWithAnalysisAsync(userId: string, file: Express.Multer.File): Promise<{
        upload: {
            url: string;
            thumbnailUrl: string;
            key: string;
            size: number;
        };
        jobId: string;
        status: import("../queue").JobStatus;
        message: string;
    }>;
    getJobStatus(userId: string, jobId: string): Promise<import("../queue").AiJobDetailResponse>;
    getUserJobs(userId: string): Promise<{
        jobs: import("../queue").AiJobDetailResponse[];
    }>;
    uploadWithAnalysis(userId: string, file: Express.Multer.File): Promise<{
        upload: {
            url: string;
            thumbnailUrl: string;
            key: string;
            size: number;
        };
        analysis: import("../ai/ai-types").FoodAnalysisResult;
        meal: import("../meals/dto/meal-response.dto").MealResponseDto;
        quota: {
            limit: number;
            remaining: number;
        };
    }>;
    deleteFile(key: string): Promise<SuccessResponse>;
    getPresignedUrl(filename: string, type: string): Promise<{
        url: string;
        key: string;
    }>;
}

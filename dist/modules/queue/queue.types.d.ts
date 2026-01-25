import { MealType } from '@prisma/client';
export declare enum JobStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED"
}
export interface CreateAiJobInput {
    userId: string;
    imageUrl: string;
    thumbnailUrl: string;
    imageBase64: string;
    mealType?: MealType;
}
export interface AiJobResponse {
    jobId: string;
    status: JobStatus;
    message: string;
}
export interface AiJobDetailResponse {
    id: string;
    status: JobStatus;
    imageUrl: string;
    thumbnailUrl: string;
    analysisResult?: unknown;
    mealId?: string;
    error?: string;
    retryCount: number;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}

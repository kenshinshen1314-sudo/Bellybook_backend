import type { Job } from 'bull';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';
import { MealsService } from '../meals/meals.service';
import { AiAnalysisJobData, EmailJobData, NotificationJobData, SyncJobData, WebhookJobData, CleanupJobData } from './bull-queue.service';
interface BatchAiAnalysisJobData {
    userId: string;
    items: Array<{
        imageUrl: string;
        thumbnailUrl: string;
        imageBase64: string;
        mealType?: string;
    }>;
}
export declare class AiAnalysisProcessor {
    private prisma;
    private aiService;
    private mealsService;
    private readonly logger;
    private readonly PROGRESS_UPDATE_INTERVAL;
    constructor(prisma: PrismaService, aiService: AiService, mealsService: MealsService);
    handleAiAnalysis(job: Job<AiAnalysisJobData>): Promise<{
        mealId: string;
        analysis: any;
    }>;
    handleBatchAiAnalysis(job: Job<BatchAiAnalysisJobData>): Promise<{
        results: Array<{
            mealId: string;
            analysis: any;
        }>;
        success: number;
        failed: number;
    }>;
    private analyzeWithProgress;
    private getUserTier;
    private getJobPriority;
    private classifyError;
    onActive(job: Job): void;
    onCompleted(job: Job, result: any): void;
    onFailed(job: Job, error: Error): void;
    onStalled(job: Job): void;
    onProgress(job: Job, progress: number): void;
}
export declare class EmailProcessor {
    private readonly logger;
    handleSendEmail(job: Job<EmailJobData>): Promise<{
        sent: boolean;
        messageId?: string;
    }>;
    onCompleted(job: Job): void;
    onFailed(job: Job, error: Error): void;
}
export declare class NotificationProcessor {
    private readonly logger;
    handleSendNotification(job: Job<NotificationJobData>): Promise<{
        sent: boolean;
    }>;
    onCompleted(job: Job): void;
}
export declare class SyncProcessor {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    handleSync(job: Job<SyncJobData>): Promise<{
        synced: number;
    }>;
    private performFullSync;
    private performIncrementalSync;
    private performCleanup;
    onCompleted(job: Job): void;
}
export declare class WebhookProcessor {
    private readonly logger;
    handleSendWebhook(job: Job<WebhookJobData>): Promise<{
        sent: boolean;
        statusCode?: number;
    }>;
    onFailed(job: Job, error: Error): void;
}
export declare class CleanupProcessor {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    handleCleanup(job: Job<CleanupJobData>): Promise<{
        deleted: number;
    }>;
    private cleanupExpiredTokens;
    private cleanupOldLogs;
    private cleanupFailedJobs;
    private cleanupCache;
    onCompleted(job: Job): void;
}
export declare const QueueProcessor: (typeof AiAnalysisProcessor | typeof EmailProcessor | typeof NotificationProcessor | typeof SyncProcessor | typeof WebhookProcessor | typeof CleanupProcessor)[];
export {};

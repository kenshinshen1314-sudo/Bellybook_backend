import type { Queue } from 'bull';
import { QueueName } from './queue.constants';
import { PrismaService } from '../../database/prisma.service';
export interface AiAnalysisJobData {
    userId: string;
    imageUrl: string;
    thumbnailUrl: string;
    imageBase64: string;
    mealType?: string;
}
export interface EmailJobData {
    to: string | string[];
    subject: string;
    template?: string;
    context?: Record<string, any>;
    html?: string;
    text?: string;
}
export interface NotificationJobData {
    userId: string;
    type: 'meal_reminder' | 'achievement_unlocked' | 'ranking_update' | 'system';
    title: string;
    body: string;
    data?: Record<string, any>;
}
export interface SyncJobData {
    userId: string;
    operation: 'full_sync' | 'incremental_sync' | 'cleanup';
    lastSyncAt?: Date;
}
export interface WebhookJobData {
    url: string;
    method: 'POST' | 'PUT' | 'PATCH';
    payload: Record<string, any>;
    headers?: Record<string, string>;
    signature?: string;
}
export interface CleanupJobData {
    type: 'expired_tokens' | 'old_logs' | 'failed_jobs' | 'cache';
    beforeDate?: Date;
}
export interface JobResponse {
    jobId: string;
    status: 'pending' | 'active' | 'completed' | 'failed';
    data?: any;
    error?: string;
}
export interface QueueStats {
    queueName: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
}
export declare class QueueService {
    private aiAnalysisQueue;
    private emailQueue;
    private notificationQueue;
    private syncQueue;
    private webhookQueue;
    private cleanupQueue;
    private prisma;
    private readonly logger;
    constructor(aiAnalysisQueue: Queue, emailQueue: Queue, notificationQueue: Queue, syncQueue: Queue, webhookQueue: Queue, cleanupQueue: Queue, prisma: PrismaService);
    addAiAnalysisJob(data: AiAnalysisJobData, options?: {
        priority?: number;
    }): Promise<string>;
    addBatchAiAnalysisJob(items: Array<{
        userId: string;
        imageUrl: string;
        thumbnailUrl: string;
        imageBase64: string;
        mealType?: string;
    }>): Promise<string>;
    getAiAnalysisJob(jobId: string): Promise<JobResponse | null>;
    getUserAiJobs(userId: string, limit?: number): Promise<JobResponse[]>;
    addEmailJob(data: EmailJobData, options?: {
        delay?: number;
        priority?: number;
    }): Promise<string>;
    addBulkEmailJobs(jobs: EmailJobData[]): Promise<string[]>;
    addNotificationJob(data: NotificationJobData): Promise<string>;
    addBroadcastNotification(userIds: string[], notification: Omit<NotificationJobData, 'userId'>): Promise<void>;
    addSyncJob(data: SyncJobData): Promise<string>;
    addWebhookJob(data: WebhookJobData): Promise<string>;
    addCleanupJob(data: CleanupJobData): Promise<string>;
    addRecurringCleanupJob(hour?: number, minute?: number): Promise<void>;
    getAllQueueStats(): Promise<QueueStats[]>;
    clearQueue(queueName: QueueName): Promise<void>;
    pauseQueue(queueName: QueueName): Promise<void>;
    resumeQueue(queueName: QueueName): Promise<void>;
    retryFailedJobs(queueName: QueueName, limit?: number): Promise<number>;
    private getQueue;
    private getUserPriority;
}

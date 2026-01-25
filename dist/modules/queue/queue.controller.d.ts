import { QueueService, QueueStats } from './bull-queue.service';
import type { QueueName } from './queue.constants';
export declare class QueueController {
    private readonly queueService;
    constructor(queueService: QueueService);
    getQueueStats(): Promise<{
        queues: QueueStats[];
    }>;
    clearQueue(queueName: QueueName): Promise<{
        message: string;
        queueName: string;
    }>;
    pauseQueue(queueName: QueueName): Promise<{
        message: string;
        queueName: string;
    }>;
    resumeQueue(queueName: QueueName): Promise<{
        message: string;
        queueName: string;
    }>;
    retryFailedJobs(queueName: QueueName, limit?: number): Promise<{
        message: string;
        queueName: string;
        retried: number;
    }>;
    addCleanupJob(): Promise<{
        message: string;
        jobId: string;
    }>;
    addRecurringCleanupJob(hour?: number, minute?: number): Promise<{
        message: string;
        hour: number;
        minute: number;
    }>;
}

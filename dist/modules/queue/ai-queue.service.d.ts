import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';
import { MealsService } from '../meals/meals.service';
import { CreateAiJobInput, AiJobResponse, AiJobDetailResponse } from './queue.types';
export declare class AiQueueService implements OnModuleInit, OnModuleDestroy {
    private prisma;
    private aiService;
    private mealsService;
    private readonly logger;
    private processingInterval;
    private activeJobs;
    private isShuttingDown;
    constructor(prisma: PrismaService, aiService: AiService, mealsService: MealsService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    createJob(input: CreateAiJobInput): Promise<AiJobResponse>;
    getJob(jobId: string, userId: string): Promise<AiJobDetailResponse | null>;
    getUserJobs(userId: string, limit?: number): Promise<AiJobDetailResponse[]>;
    private startProcessor;
    private stopProcessor;
    private processPendingJobs;
    private processJob;
    cleanupExpiredJobs(): Promise<void>;
}

/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 AI 队列服务的测试用例
 * [POS]: queue 模块的测试文件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AiQueueService } from './ai-queue.service';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';
import { MealsService } from '../meals/meals.service';
import { MealType } from '@prisma/client';
import { JobStatus } from './queue.types';

describe('AiQueueService', () => {
  let service: AiQueueService;
  let prismaService: jest.Mocked<PrismaService>;
  let aiService: jest.Mocked<AiService>;
  let mealsService: jest.Mocked<MealsService>;

  const mockPrismaService = {
    ai_analysis_jobs: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockAiService = {
    analyzeFoodImage: jest.fn(),
  };

  const mockMealsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiQueueService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AiService,
          useValue: mockAiService,
        },
        {
          provide: MealsService,
          useValue: mockMealsService,
        },
      ],
    }).compile();

    service = module.get<AiQueueService>(AiQueueService);
    prismaService = module.get(PrismaService);
    aiService = module.get(AiService);
    mealsService = module.get(MealsService);

    jest.clearAllMocks();
  });

  describe('createJob', () => {
    it('should create a new AI analysis job', async () => {
      const userId = 'user123';
      const input = {
        userId,
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        imageBase64: 'base64data',
        mealType: MealType.LUNCH,
      };

      const mockJob = {
        id: 'job123',
        userId,
        imageUrl: input.imageUrl,
        thumbnailUrl: input.thumbnailUrl,
        status: 'PENDING',
        createdAt: new Date(),
      };

      mockPrismaService.ai_analysis_jobs.create.mockResolvedValue(mockJob);

      const result = await service.createJob(input);

      expect(prismaService.ai_analysis_jobs.create).toHaveBeenCalledWith({
        data: {
          userId,
          imageUrl: input.imageUrl,
          thumbnailUrl: input.thumbnailUrl,
          imageBase64: input.imageBase64,
          mealType: input.mealType,
          status: 'PENDING',
          expiresAt: expect.any(Date),
        },
      });
      expect(result.jobId).toBe('job123');
      expect(result.status).toBe(JobStatus.PENDING);
    });
  });

  describe('getJob', () => {
    it('should return job details', async () => {
      const userId = 'user123';
      const jobId = 'job123';

      const mockJob = {
        id: jobId,
        userId,
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        status: 'COMPLETED',
        analysisResult: { dishes: [{ foodName: 'Test' }] },
        mealId: 'meal123',
        error: null,
        retryCount: 0,
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
      };

      mockPrismaService.ai_analysis_jobs.findUnique.mockResolvedValue(mockJob);

      const result = await service.getJob(jobId, userId);

      expect(result).toHaveProperty('id', jobId);
      expect(result).toHaveProperty('status', 'COMPLETED');
      expect(result).toHaveProperty('mealId', 'meal123');
    });

    it('should return null for different user', async () => {
      const userId = 'user123';
      const jobId = 'job123';

      mockPrismaService.ai_analysis_jobs.findUnique.mockResolvedValue(null);

      const result = await service.getJob(jobId, userId);

      expect(result).toBeNull();
    });
  });

  describe('getUserJobs', () => {
    it('should return user jobs with limit', async () => {
      const userId = 'user123';

      const mockJobs = [
        {
          id: 'job1',
          userId,
          status: 'COMPLETED',
          imageUrl: 'https://example.com/image1.jpg',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          createdAt: new Date(),
          startedAt: new Date(),
          completedAt: new Date(),
        },
        {
          id: 'job2',
          userId,
          status: 'PENDING',
          imageUrl: 'https://example.com/image2.jpg',
          thumbnailUrl: 'https://example.com/thumb2.jpg',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.ai_analysis_jobs.findMany.mockResolvedValue(mockJobs);

      const result = await service.getUserJobs(userId, 10);

      expect(prismaService.ai_analysis_jobs.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('processJob', () => {
    it('should process job successfully', async () => {
      const jobId = 'job123';
      const userId = 'user123';

      const mockJob = {
        id: jobId,
        userId,
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        imageBase64: 'base64data',
        mealType: MealType.LUNCH,
        status: 'PENDING',
        retryCount: 0,
      };

      const mockAnalysis = {
        dishes: [{
          foodName: 'Test Food',
          cuisine: 'Chinese',
          nutrition: {
            calories: 500,
            protein: 20,
            fat: 15,
            carbohydrates: 60,
          },
        }],
        nutrition: {
          calories: 500,
          protein: 20,
          fat: 15,
          carbohydrates: 60,
        },
      };

      const mockMeal = {
        id: 'meal123',
        userId,
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        createdAt: new Date(),
      };

      // Mock sequence of calls
      mockPrismaService.ai_analysis_jobs.update.mockResolvedValueOnce({
        ...mockJob,
        status: 'PROCESSING',
        startedAt: new Date(),
      });

      mockPrismaService.ai_analysis_jobs.findUnique.mockResolvedValueOnce(mockJob);
      mockAiService.analyzeFoodImage.mockResolvedValue(mockAnalysis);
      mockMealsService.create.mockResolvedValue(mockMeal as any);
      mockPrismaService.ai_analysis_jobs.update.mockResolvedValueOnce({
        ...mockJob,
        status: 'COMPLETED',
        analysisResult: mockAnalysis,
        mealId: 'meal123',
        completedAt: new Date(),
      });

      // Call processJob through the private method access
      await service['processJob'](jobId);

      expect(aiService.analyzeFoodImage).toHaveBeenCalledWith('base64data');
      expect(mealsService.create).toHaveBeenCalled();
    });

    it('should handle job failure and retry', async () => {
      const jobId = 'job123';
      const userId = 'user123';

      const mockJob = {
        id: jobId,
        userId,
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        imageBase64: 'base64data',
        mealType: MealType.LUNCH,
        status: 'PENDING',
        retryCount: 0,
      };

      mockPrismaService.ai_analysis_jobs.update.mockResolvedValueOnce({
        ...mockJob,
        status: 'PROCESSING',
        startedAt: new Date(),
      });

      mockPrismaService.ai_analysis_jobs.findUnique.mockResolvedValueOnce(mockJob);
      mockAiService.analyzeFoodImage.mockRejectedValue(new Error('AI failed'));
      mockPrismaService.ai_analysis_jobs.update.mockResolvedValueOnce({
        ...mockJob,
        status: 'PENDING',
        error: 'AI failed',
        retryCount: 1,
      });

      await service['processJob'](jobId);

      expect(mockPrismaService.ai_analysis_jobs.update).toHaveBeenCalledTimes(2);
    });

    it('should mark job as failed after max retries', async () => {
      const jobId = 'job123';
      const userId = 'user123';

      const mockJob = {
        id: jobId,
        userId,
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        imageBase64: 'base64data',
        mealType: MealType.LUNCH,
        status: 'PENDING',
        retryCount: 2, // Already retried twice
      };

      // First call: update to PROCESSING
      mockPrismaService.ai_analysis_jobs.update
        .mockResolvedValueOnce({
          ...mockJob,
          status: 'PROCESSING',
          startedAt: new Date(),
        })
        // Second call: mark as FAILED
        .mockResolvedValueOnce({
          ...mockJob,
          status: 'FAILED',
          error: 'AI failed',
          retryCount: 3,
          completedAt: new Date(),
        });

      // Mock findUnique calls:
      // 1. First call in processJob (line 205) - returns full job
      // 2. Second call in error handler (line 243) - returns only retryCount
      mockPrismaService.ai_analysis_jobs.findUnique
        .mockResolvedValueOnce(mockJob)  // First call returns full job
        .mockResolvedValueOnce({ retryCount: 2 });  // Second call returns retryCount for calculation

      mockAiService.analyzeFoodImage.mockRejectedValue(new Error('AI failed'));

      await service['processJob'](jobId);

      // Verify update was called twice and the second call was for FAILED status
      expect(prismaService.ai_analysis_jobs.update).toHaveBeenCalledTimes(2);
      const secondCall = (prismaService.ai_analysis_jobs.update as jest.Mock).mock.calls[1];
      expect(secondCall).toEqual([
        {
          where: { id: jobId },
          data: expect.objectContaining({
            status: 'FAILED',
            error: 'AI failed',
            retryCount: 3,
            completedAt: expect.any(Date),
          }),
        },
      ]);
    });
  });

  describe('cleanupExpiredJobs', () => {
    it('should delete completed jobs older than expiry', async () => {
      mockPrismaService.ai_analysis_jobs.deleteMany.mockResolvedValue({ count: 5 });

      await service.cleanupExpiredJobs();

      expect(prismaService.ai_analysis_jobs.deleteMany).toHaveBeenCalledWith({
        where: {
          status: 'COMPLETED',
          completedAt: {
            lt: expect.any(Date),
          },
        },
      });
    });
  });
});

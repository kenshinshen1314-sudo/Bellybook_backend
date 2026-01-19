import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { PrismaService } from '../../database/prisma.service';
import { SyncPushRequestDto } from './dto/sync.dto';

describe('SyncService', () => {
  let service: SyncService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    meal: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userProfile: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    userSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    cuisineUnlock: {
      findMany: jest.fn(),
    },
    syncQueue: {
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    syncLog: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('pull', () => {
    it('should return data modified since lastSyncAt', async () => {
      const userId = 'userId123';
      const lastSyncAt = new Date('2024-01-01T00:00:00Z');

      const meals = [
        { id: 'meal1', userId, createdAt: new Date('2024-01-02T00:00:00Z') },
        { id: 'meal2', userId, createdAt: new Date('2024-01-03T00:00:00Z') },
      ];

      const profile = { userId, displayName: 'Test User' };
      const settings = { userId, theme: 'DARK' };
      const cuisineUnlocks = [
        { userId, cuisineName: 'Chinese', mealCount: 5 },
      ];

      mockPrismaService.meal.findMany.mockResolvedValue(meals);
      mockPrismaService.userProfile.findUnique.mockResolvedValue(profile);
      mockPrismaService.userSettings.findUnique.mockResolvedValue(settings);
      mockPrismaService.cuisineUnlock.findMany.mockResolvedValue(cuisineUnlocks);

      const result = await service.pull(userId, lastSyncAt);

      expect(result.meals).toHaveLength(2);
      expect(result.profile).toBeDefined();
      expect(result.settings).toBeDefined();
      expect(result.cuisineUnlocks).toHaveLength(1);
      expect(result.serverTime).toBeDefined();
      expect(result.hasMore).toBe(false);
    });

    it('should return all data when no lastSyncAt provided', async () => {
      const userId = 'userId123';

      mockPrismaService.meal.findMany.mockResolvedValue([]);
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.userSettings.findUnique.mockResolvedValue(null);
      mockPrismaService.cuisineUnlock.findMany.mockResolvedValue([]);

      const result = await service.pull(userId);

      expect(mockPrismaService.meal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, deletedAt: null },
        })
      );
      expect(result.serverTime).toBeDefined();
    });

    it('should set hasMore to true when returning 100 meals', async () => {
      const userId = 'userId123';

      const meals = Array.from({ length: 100 }, (_, i) => ({
        id: `meal${i}`,
        userId,
      }));

      mockPrismaService.meal.findMany.mockResolvedValue(meals);
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.userSettings.findUnique.mockResolvedValue(null);
      mockPrismaService.cuisineUnlock.findMany.mockResolvedValue([]);

      const result = await service.pull(userId);

      expect(result.hasMore).toBe(true);
    });
  });

  describe('push', () => {
    it('should successfully process all sync items', async () => {
      const userId = 'userId123';
      const dto: SyncPushRequestDto = {
        items: [
          {
            id: 'item1',
            type: 'CREATE_MEAL',
            payload: {
              imageUrl: 'https://example.com/image.jpg',
              foodName: 'Test Food',
              cuisine: 'Chinese',
              analysis: {
                foodName: 'Test Food',
                cuisine: 'Chinese',
                nutrition: {
                  calories: 500,
                  protein: 20,
                  fat: 15,
                  carbohydrates: 60,
                },
                analyzedAt: new Date().toISOString(),
              },
            },
            clientId: 'client1',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'item2',
            type: 'UPDATE_PROFILE',
            payload: { displayName: 'Updated Name' },
            clientId: 'client2',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      mockPrismaService.meal.create.mockResolvedValue({});
      mockPrismaService.userProfile.upsert.mockResolvedValue({});

      const result = await service.push(userId, dto);

      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
      expect(result.serverTime).toBeDefined();
    });

    it('should handle CREATE_MEAL operation', async () => {
      const userId = 'userId123';
      const dto: SyncPushRequestDto = {
        items: [
          {
            id: 'item1',
            type: 'CREATE_MEAL',
            payload: {
              imageUrl: 'https://example.com/image.jpg',
              foodName: 'Test Food',
              cuisine: 'Chinese',
            },
            clientId: 'client1',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      mockPrismaService.meal.create.mockResolvedValue({});

      const result = await service.push(userId, dto);

      expect(result.success).toContain('client1');
      expect(mockPrismaService.meal.create).toHaveBeenCalled();
    });

    it('should handle UPDATE_MEAL operation', async () => {
      const userId = 'userId123';
      const dto: SyncPushRequestDto = {
        items: [
          {
            id: 'item1',
            type: 'UPDATE_MEAL',
            payload: {
              id: 'meal123',
              version: 1,
              notes: 'Updated notes',
            },
            clientId: 'client1',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const meal = { id: 'meal123', userId, version: 1 };
      mockPrismaService.meal.findFirst.mockResolvedValue(meal);
      mockPrismaService.meal.update.mockResolvedValue({});

      const result = await service.push(userId, dto);

      expect(result.success).toContain('client1');
    });

    it('should handle DELETE_MEAL operation', async () => {
      const userId = 'userId123';
      const dto: SyncPushRequestDto = {
        items: [
          {
            id: 'item1',
            type: 'DELETE_MEAL',
            payload: { id: 'meal123' },
            clientId: 'client1',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const meal = { id: 'meal123', userId };
      mockPrismaService.meal.findFirst.mockResolvedValue(meal);
      mockPrismaService.meal.update.mockResolvedValue({});

      const result = await service.push(userId, dto);

      expect(result.success).toContain('client1');
      expect(mockPrismaService.meal.update).toHaveBeenCalledWith({
        where: { id: 'meal123' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should handle version conflict in UPDATE_MEAL', async () => {
      const userId = 'userId123';
      const dto: SyncPushRequestDto = {
        items: [
          {
            id: 'item1',
            type: 'UPDATE_MEAL',
            payload: {
              id: 'meal123',
              version: 1,
              notes: 'Updated notes',
            },
            clientId: 'client1',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const meal = { id: 'meal123', userId, version: 2 };
      mockPrismaService.meal.findFirst.mockResolvedValue(meal);

      const result = await service.push(userId, dto);

      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].clientId).toBe('client1');
      expect(result.failed[0].error).toContain('Version conflict');
    });

    it('should handle unknown operation type', async () => {
      const userId = 'userId123';
      const dto: SyncPushRequestDto = {
        items: [
          {
            id: 'item1',
            type: 'UNKNOWN_OPERATION' as any,
            payload: {},
            clientId: 'client1',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const result = await service.push(userId, dto);

      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].code).toBe('UNKNOWN_OPERATION');
    });
  });

  describe('getStatus', () => {
    it('should return sync status', async () => {
      const userId = 'userId123';

      mockPrismaService.syncQueue.count.mockResolvedValue(5);
      mockPrismaService.syncLog.findFirst.mockResolvedValue({
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });

      const result = await service.getStatus(userId);

      expect(result.pendingItems).toBe(5);
      expect(result.lastSyncAt).toBeDefined();
      expect(result.serverTime).toBeDefined();
      expect(result.isHealthy).toBe(true);
    });

    it('should mark as unhealthy when pending items > 100', async () => {
      const userId = 'userId123';

      mockPrismaService.syncQueue.count.mockResolvedValue(150);
      mockPrismaService.syncLog.findFirst.mockResolvedValue(null);

      const result = await service.getStatus(userId);

      expect(result.isHealthy).toBe(false);
    });
  });

  describe('clearQueue', () => {
    it('should clear sync queue', async () => {
      const userId = 'userId123';

      mockPrismaService.syncQueue.deleteMany.mockResolvedValue({ count: 10 });

      await service.clearQueue(userId);

      expect(mockPrismaService.syncQueue.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });
});

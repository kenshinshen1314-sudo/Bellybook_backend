/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供排名服务的测试用例
 * [POS]: ranking 模块的测试文件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Test, TestingModule } from '@nestjs/testing';
import { RankingService } from './ranking.service';
import { PrismaService } from '../../database/prisma.service';
import { RankingPeriod } from './dto/ranking-query.dto';

describe('RankingService', () => {
  let service: RankingService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    cuisine_unlocks: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    meal: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    dish_unlocks: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RankingService>(RankingService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('getCuisineMasters', () => {
    it('should return cuisine masters for specific cuisine', async () => {
      const mockUsers = [
        { id: 'user1', username: 'user1', avatarUrl: 'avatar1.jpg' },
        { id: 'user2', username: 'user2', avatarUrl: 'avatar2.jpg' },
      ];

      const mockMeals = [
        { userId: 'user1', cuisine: 'Chinese', createdAt: new Date() },
        { userId: 'user1', cuisine: 'Italian', createdAt: new Date() },
        { userId: 'user2', cuisine: 'Chinese', createdAt: new Date() },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrismaService.meal.findMany.mockResolvedValue(mockMeals as any);

      const result = await service.getCuisineMasters('Chinese');

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          user_settings: {
            hideRanking: false,
          },
        },
        select: {
          id: true,
          username: true,
          avatarUrl: true,
        },
      });
      expect(prismaService.meal.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: { in: ['user1', 'user2'] },
          cuisine: 'Chinese',
        }),
        select: {
          userId: true,
          cuisine: true,
          createdAt: true,
        },
      });
      expect(result.masters).toBeDefined();
      expect(Array.isArray(result.masters)).toBe(true);
    });

    it('should filter by period correctly', async () => {
      const mockUsers = [{ id: 'user1', username: 'user1', avatarUrl: null }];
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrismaService.meal.findMany.mockResolvedValue([] as any);

      await service.getCuisineMasters('Chinese', RankingPeriod.WEEKLY);

      expect(prismaService.meal.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          createdAt: expect.any(Object),
        }),
        select: expect.anything(),
      });
    });
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard with scores', async () => {
      const mockUsers = [
        { id: 'user1', username: 'user1', avatarUrl: 'avatar1.jpg' },
        { id: 'user2', username: 'user2', avatarUrl: 'avatar2.jpg' },
      ];

      const mockMeals = [
        { userId: 'user1', cuisine: 'Chinese', calories: 500 },
        { userId: 'user1', cuisine: 'Italian', calories: 400 },
        { userId: 'user2', cuisine: 'Chinese', calories: 450 },
        { userId: 'user2', cuisine: 'Japanese', calories: 350 },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrismaService.meal.findMany.mockResolvedValue(mockMeals as any);

      const result = await service.getLeaderboard();

      expect(result.leaderboard).toBeDefined();
      expect(Array.isArray(result.leaderboard)).toBe(true);
    });

    it('should support tier filtering', async () => {
      const mockUsers = [{ id: 'user1', username: 'user1', avatarUrl: null }];
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrismaService.meal.findMany.mockResolvedValue([] as any);

      await service.getLeaderboard(RankingPeriod.ALL_TIME, 'PREMIUM');

      // Verify subscriptionTier is in the where clause
      const calls = (prismaService.user.findMany as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const whereClause = calls[0][0].where;
      expect(whereClause).toHaveProperty('subscriptionTier', 'PREMIUM');
    });
  });

  describe('getGourmets', () => {
    it('should return users ordered by unique cuisine count', async () => {
      const mockUsers = [
        { id: 'user1', username: 'foodie1', avatarUrl: 'avatar1.jpg' },
        { id: 'user2', username: 'foodie2', avatarUrl: 'avatar2.jpg' },
      ];

      const mockMeals = [
        { userId: 'user1', cuisine: 'Chinese', createdAt: new Date() },
        { userId: 'user1', cuisine: 'Italian', createdAt: new Date() },
        { userId: 'user1', cuisine: 'Japanese', createdAt: new Date() },
        { userId: 'user2', cuisine: 'Chinese', createdAt: new Date() },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrismaService.meal.findMany.mockResolvedValue(mockMeals as any);

      const result = await service.getGourmets();

      expect(result.gourmets).toBeDefined();
      expect(result.gourmets[0].cuisineCount).toBeGreaterThanOrEqual(result.gourmets[1].cuisineCount);
    });
  });

  describe('getDishExperts', () => {
    it('should return users ordered by unique dish count', async () => {
      const mockUsers = [
        { id: 'user1', username: 'expert1', avatarUrl: 'avatar1.jpg' },
        { id: 'user2', username: 'expert2', avatarUrl: 'avatar2.jpg' },
      ];

      const mockUnlocks = [
        { userId: 'user1', dishName: 'Kung Pao Chicken', mealCount: 5 },
        { userId: 'user1', dishName: 'Mapo Tofu', mealCount: 3 },
        { userId: 'user2', dishName: 'Sushi', mealCount: 4 },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrismaService.dish_unlocks.findMany.mockResolvedValue(mockUnlocks as any);

      const result = await service.getDishExperts();

      expect(result.experts).toBeDefined();
      expect(result.experts[0].dishCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getDateRange', () => {
    it('should return correct date range for ALL_TIME', () => {
      const { startDate } = service['getDateRange'](RankingPeriod.ALL_TIME);
      expect(startDate).toBeUndefined();
    });

    it('should return correct date range for WEEKLY', () => {
      const { startDate } = service['getDateRange'](RankingPeriod.WEEKLY);
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const diffDays = Math.abs(startDate!.getTime() - weekAgo.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeLessThan(1); // Should be within 1 day
    });

    it('should return correct date range for MONTHLY', () => {
      const { startDate } = service['getDateRange'](RankingPeriod.MONTHLY);
      const now = new Date();
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const diffDays = Math.abs(startDate!.getTime() - monthAgo.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeLessThan(1); // Should be within 1 day
    });

    it('should return correct date range for YEARLY', () => {
      const { startDate } = service['getDateRange'](RankingPeriod.YEARLY);
      const now = new Date();
      const yearAgo = new Date(now);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);

      const diffDays = Math.abs(startDate!.getTime() - yearAgo.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeLessThan(1); // Should be within 1 day
    });
  });

  describe('getCuisineExpertDetail', () => {
    it('should return cuisine expert detail for user', async () => {
      const mockUser = {
        id: 'user1',
        username: 'expert1',
        avatarUrl: 'avatar1.jpg',
      };

      const mockMeals = [
        {
          foodName: 'Kung Pao Chicken',
          cuisine: 'Chinese',
          createdAt: new Date(),
          imageUrl: 'https://example.com/image.jpg',
          calories: 500,
          notes: 'Delicious',
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrismaService.meal.findMany.mockResolvedValue(mockMeals as any);

      const result = await service.getCuisineExpertDetail('user1', 'Chinese');

      expect(result.userId).toBe('user1');
      expect(result.cuisineName).toBe('Chinese');
      expect(result.totalDishes).toBe(1);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCuisineExpertDetail('nonexistent', 'Chinese'))
        .rejects.toThrow('User not found');
    });
  });

  describe('getAllUsersDishes', () => {
    it('should return all users dishes grouped by user and cuisine', async () => {
      const mockUsers = [
        { id: 'user1', username: 'user1', avatarUrl: 'avatar1.jpg' },
        { id: 'user2', username: 'user2', avatarUrl: 'avatar2.jpg' },
      ];

      const mockMeals = [
        { userId: 'user1', foodName: 'Dish1', cuisine: 'Chinese', createdAt: new Date() },
        { userId: 'user1', foodName: 'Dish2', cuisine: 'Chinese', createdAt: new Date() },
        { userId: 'user2', foodName: 'Dish3', cuisine: 'Japanese', createdAt: new Date() },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrismaService.meal.findMany.mockResolvedValue(mockMeals as any);

      const result = await service.getAllUsersDishes();

      expect(result.totalEntries).toBeGreaterThan(0);
      expect(result.totalUsers).toBe(2);
    });
  });

  describe('getUserUnlockedDishes', () => {
    it('should return user unlocked dishes', async () => {
      const mockUser = {
        id: 'user1',
        username: 'user1',
        avatarUrl: 'avatar1.jpg',
      };

      const mockUnlocks = [
        { dishName: 'Kung Pao Chicken', mealCount: 5, firstMealAt: new Date(), lastMealAt: new Date() },
        { dishName: 'Mapo Tofu', mealCount: 3, firstMealAt: new Date(), lastMealAt: new Date() },
      ];

      const mockMeals = [
        { foodName: 'Kung Pao Chicken', cuisine: 'Chinese', imageUrl: 'image.jpg', calories: 500 },
        { foodName: 'Mapo Tofu', cuisine: 'Chinese', imageUrl: 'image2.jpg', calories: 400 },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrismaService.dish_unlocks.findMany.mockResolvedValue(mockUnlocks as any);
      mockPrismaService.meal.findMany.mockResolvedValue(mockMeals as any);

      const result = await service.getUserUnlockedDishes('user1');

      expect(result.userId).toBe('user1');
      expect(result.totalDishes).toBe(2);
      expect(result.dishes).toHaveLength(2);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserUnlockedDishes('nonexistent'))
        .rejects.toThrow('User not found');
    });
  });
});

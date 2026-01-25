import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../cache/cache.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    meal: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    cuisine_unlocks: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    user_profiles: {
      upsert: jest.fn(),
    },
    user_settings: {
      upsert: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const userId = 'userId123';
      const user = {
        id: userId,
        username: 'testuser',
        displayName: 'Test User',
        user_profiles: {
          displayName: 'Test User',
          bio: null,
          avatarUrl: null,
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.getProfile(userId);

      expect(result.username).toBe('testuser');
      expect(result.displayName).toBe('Test User');
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'nonexistent';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const userId = 'userId123';
      const dto: UpdateProfileDto = {
        displayName: 'Updated Name',
      };

      const user = {
        id: userId,
        username: 'testuser',
        user_profiles: {
          displayName: 'Updated Name',
        },
      };

      mockPrismaService.user.upsert.mockResolvedValue(user);

      const result = await service.updateProfile(userId, dto);

      expect(result.displayName).toBe('Updated Name');
    });
  });

  describe('updateSettings', () => {
    it('should update user settings', async () => {
      const userId = 'userId123';
      const dto: UpdateSettingsDto = {
        theme: 'DARK',
      };

      const user = {
        id: userId,
        user_settings: {
          theme: 'DARK',
        },
      };

      mockPrismaService.user.upsert.mockResolvedValue(user);

      const result = await service.updateSettings(userId, dto);

      expect(result.theme).toBe('DARK');
    });
  });

  describe('getStats', () => {
    it('should return user statistics', async () => {
      const userId = 'userId123';

      const user = { id: userId };
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      // Mock $queryRaw calls - need to mock in order:
      // 1. First call: periodCounts (week/month meals)
      // 2. Second call: calculateStreakOptimized
      // 3. Third call: calculateLongestStreakOptimized
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ week_count: 7n, month_count: 20n }])  // periodCounts
        .mockResolvedValueOnce([{ streak: 0n }])  // calculateStreakOptimized
        .mockResolvedValueOnce([{ longest_streak: 0n }]);  // calculateLongestStreakOptimized

      mockPrismaService.meal.count.mockResolvedValueOnce(10); // totalMeals
      mockPrismaService.cuisine_unlocks.count.mockResolvedValueOnce(5); // totalCuisines
      mockPrismaService.cuisine_unlocks.findMany.mockResolvedValue([
        { cuisineName: 'Chinese', mealCount: 5 },
        { cuisineName: 'Japanese', mealCount: 3 },
      ]);

      const result = await service.getStats(userId);

      expect(result.totalMeals).toBe(10);
      expect(result.totalCuisines).toBe(5);
      expect(result.thisWeekMeals).toBe(7);
      expect(result.thisMonthMeals).toBe(20);
      expect(result.favoriteCuisines).toHaveLength(2);
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'nonexistent';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getStats(userId)).rejects.toThrow(NotFoundException);
    });

    it('should calculate streak correctly', async () => {
      const userId = 'userId123';

      const user = { id: userId };
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      // Mock $queryRaw calls in order:
      // 1. periodCounts (week/month meals)
      // 2. calculateStreakOptimized - return streak count of 5
      // 3. calculateLongestStreakOptimized
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ week_count: 5n, month_count: 5n }])  // periodCounts
        .mockResolvedValueOnce([{ streak: 5n }])  // calculateStreakOptimized
        .mockResolvedValueOnce([{ longest_streak: 5n }]);  // calculateLongestStreakOptimized

      mockPrismaService.meal.count.mockResolvedValueOnce(5); // totalMeals
      mockPrismaService.cuisine_unlocks.count.mockResolvedValueOnce(3); // totalCuisines
      mockPrismaService.cuisine_unlocks.findMany.mockResolvedValue([]);

      const result = await service.getStats(userId);

      expect(result.currentStreak).toBe(5);
    });
  });

  describe('deleteAccount', () => {
    it('should soft delete account', async () => {
      const userId = 'userId123';

      mockPrismaService.user.update.mockResolvedValue({});

      await service.deleteAccount(userId);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          deletedAt: expect.any(Date),
          email: null,
        },
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MealsService } from './meals.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';

describe('MealsService', () => {
  let service: MealsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    meal: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    cuisineUnlock: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    cuisineConfig: {
      findUnique: jest.fn(),
    },
    dailyNutrition: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MealsService>(MealsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new meal', async () => {
      const userId = 'userId123';
      const dto: CreateMealDto = {
        imageUrl: 'https://example.com/image.jpg',
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
      };

      const meal = {
        id: 'meal123',
        userId,
        imageUrl: dto.imageUrl,
        foodName: dto.analysis.foodName,
        cuisine: dto.analysis.cuisine,
        calories: dto.analysis.nutrition.calories,
        protein: dto.analysis.nutrition.protein,
        fat: dto.analysis.nutrition.fat,
        carbohydrates: dto.analysis.nutrition.carbohydrates,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.meal.create.mockResolvedValue(meal);
      mockPrismaService.cuisineUnlock.findUnique.mockResolvedValue(null);
      mockPrismaService.cuisineConfig.findUnique.mockResolvedValue({
        icon: '🍜',
        color: '#FF0000',
      });
      mockPrismaService.cuisineUnlock.create.mockResolvedValue({});
      mockPrismaService.dailyNutrition.findUnique.mockResolvedValue(null);
      mockPrismaService.dailyNutrition.create.mockResolvedValue({});

      const result = await service.create(userId, dto);

      expect(result.id).toBe('meal123');
      expect(result.foodName).toBe('Test Food');
      expect(mockPrismaService.meal.create).toHaveBeenCalled();
    });

    it('should update existing cuisine unlock', async () => {
      const userId = 'userId123';
      const dto: CreateMealDto = {
        imageUrl: 'https://example.com/image.jpg',
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
      };

      const meal = { id: 'meal123', userId };
      mockPrismaService.meal.create.mockResolvedValue(meal);

      const existingUnlock = { id: 1, mealCount: 3 };
      mockPrismaService.cuisineUnlock.findUnique.mockResolvedValue(existingUnlock);
      mockPrismaService.cuisineUnlock.update.mockResolvedValue({});
      mockPrismaService.dailyNutrition.findUnique.mockResolvedValue(null);
      mockPrismaService.dailyNutrition.create.mockResolvedValue({});

      await service.create(userId, dto);

      expect(mockPrismaService.cuisineUnlock.update).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated meals', async () => {
      const userId = 'userId123';
      const query = {
        page: 1,
        limit: 20,
      };

      const meals = [
        { id: 'meal1', userId },
        { id: 'meal2', userId },
      ];

      mockPrismaService.meal.findMany.mockResolvedValue(meals);
      mockPrismaService.meal.count.mockResolvedValue(2);

      const result = await service.findAll(userId, query as any);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by meal type', async () => {
      const userId = 'userId123';
      const query = {
        page: 1,
        limit: 20,
        mealType: 'BREAKFAST' as const,
      };

      mockPrismaService.meal.findMany.mockResolvedValue([]);
      mockPrismaService.meal.count.mockResolvedValue(0);

      await service.findAll(userId, query as any);

      expect(mockPrismaService.meal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            mealType: 'BREAKFAST',
          }),
        })
      );
    });

    it('should filter by date range', async () => {
      const userId = 'userId123';
      const query = {
        page: 1,
        limit: 20,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
      };

      mockPrismaService.meal.findMany.mockResolvedValue([]);
      mockPrismaService.meal.count.mockResolvedValue(0);

      await service.findAll(userId, query as any);

      expect(mockPrismaService.meal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return a meal', async () => {
      const userId = 'userId123';
      const mealId = 'meal123';

      const meal = { id: mealId, userId };
      mockPrismaService.meal.findFirst.mockResolvedValue(meal);

      const result = await service.findOne(userId, mealId);

      expect(result.id).toBe(mealId);
    });

    it('should throw NotFoundException if meal not found', async () => {
      const userId = 'userId123';
      const mealId = 'nonexistent';

      mockPrismaService.meal.findFirst.mockResolvedValue(null);

      await expect(service.findOne(userId, mealId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a meal', async () => {
      const userId = 'userId123';
      const mealId = 'meal123';
      const dto: UpdateMealDto = {
        mealType: 'LUNCH',
      };

      const meal = { id: mealId, userId, version: 1 };
      const updatedMeal = { id: mealId, userId, version: 2, mealType: 'LUNCH' };

      mockPrismaService.meal.findFirst.mockResolvedValue(meal);
      mockPrismaService.meal.update.mockResolvedValue(updatedMeal);

      const result = await service.update(userId, mealId, dto);

      expect(result.version).toBe(2);
    });

    it('should throw NotFoundException if meal not found', async () => {
      const userId = 'userId123';
      const mealId = 'nonexistent';
      const dto: UpdateMealDto = {};

      mockPrismaService.meal.findFirst.mockResolvedValue(null);

      await expect(service.update(userId, mealId, dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a meal', async () => {
      const userId = 'userId123';
      const mealId = 'meal123';

      const meal = { id: mealId, userId };
      mockPrismaService.meal.findFirst.mockResolvedValue(meal);
      mockPrismaService.meal.update.mockResolvedValue({});

      await service.remove(userId, mealId);

      expect(mockPrismaService.meal.update).toHaveBeenCalledWith({
        where: { id: mealId },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException if meal not found', async () => {
      const userId = 'userId123';
      const mealId = 'nonexistent';

      mockPrismaService.meal.findFirst.mockResolvedValue(null);

      await expect(service.remove(userId, mealId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getToday', () => {
    it('should return today\'s meals', async () => {
      const userId = 'userId123';

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const meals = [
        { id: 'meal1', userId, createdAt: new Date() },
        { id: 'meal2', userId, createdAt: new Date() },
      ];

      mockPrismaService.meal.findMany.mockResolvedValue(meals);

      const result = await service.getToday(userId);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.meal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lt: expect.any(Date),
            }),
          }),
        })
      );
    });
  });

  describe('getByDate', () => {
    it('should return meals for a specific date', async () => {
      const userId = 'userId123';
      const date = new Date('2024-01-15');

      const meals = [{ id: 'meal1', userId }];

      mockPrismaService.meal.findMany.mockResolvedValue(meals);

      const result = await service.getByDate(userId, date);

      expect(result).toHaveLength(1);
    });
  });
});

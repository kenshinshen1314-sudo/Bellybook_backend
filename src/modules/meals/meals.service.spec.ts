/**
 * [INPUT]: 依赖 PrismaService 的数据库访问、DishesService 的菜品知识库操作、DateUtil 的日期处理
 * [OUTPUT]: 对外提供餐食 CRUD、今日餐食、按日期查询、按菜品查询
 * [POS]: meals 模块的核心服务层，被 storage、sync 模块消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Test, TestingModule } from '@nestjs/testing';
import { MealsService } from './meals.service';
import { PrismaService } from '../../database/prisma.service';
import { DishesService } from '../dishes/dishes.service';
import { CacheService } from '../cache/cache.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { MealType } from '@prisma/client';

describe('MealsService', () => {
  let service: MealsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockTx = {
    meal: {
      create: jest.fn(),
    },
    dish: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    cuisine_unlocks: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    cuisine_configs: {
      findUnique: jest.fn(),
    },
    daily_nutritions: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    dish_unlocks: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPrismaService = {
    meal: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    cuisine_unlocks: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    cuisine_configs: {
      findUnique: jest.fn(),
    },
    daily_nutritions: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    dish_unlocks: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    dish: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    runTransaction: jest.fn(),
  };

  const mockDishesService = {
    findOrCreateAndUpdateInTx: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: DishesService,
          useValue: mockDishesService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<MealsService>(MealsService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new meal with transaction', async () => {
      const userId = 'userId123';
      const dto: CreateMealDto = {
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        analysis: {
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
          foodPrice: 50,
          description: 'Test description',
        },
        mealType: MealType.LUNCH,
      };

      const mockMeal = {
        id: 'meal123',
        userId,
        imageUrl: dto.imageUrl,
        thumbnailUrl: dto.thumbnailUrl,
        foodName: 'Test Food',
        cuisine: 'Chinese',
        mealType: MealType.LUNCH,
        calories: 500,
        protein: 20,
        fat: 15,
        carbohydrates: 60,
        price: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
        analyzedAt: new Date(),
        isSynced: false,
        version: 1,
      };

      const mockDish = {
        id: 1,
        name: 'Test Food',
        cuisine: 'Chinese',
      };

      // Mock runTransaction to execute the callback
      (prismaService.runTransaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx as any);
      });

      mockDishesService.findOrCreateAndUpdateInTx.mockResolvedValue(mockDish);
      mockTx.meal.create.mockResolvedValue(mockMeal);
      mockTx.cuisine_unlocks.findUnique.mockResolvedValue(null);
      mockTx.cuisine_configs.findUnique.mockResolvedValue({ icon: '🍜', color: '#FF5722' });
      mockTx.daily_nutritions.findUnique.mockResolvedValue(null);
      mockTx.dish_unlocks.findUnique.mockResolvedValue(null);

      const result = await service.create(userId, dto);

      expect(prismaService.runTransaction).toHaveBeenCalled();
      expect(mockDishesService.findOrCreateAndUpdateInTx).toHaveBeenCalled();
      expect(mockTx.meal.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'meal123');
    });

    it('should update existing cuisine unlock', async () => {
      const userId = 'userId123';
      const dto: CreateMealDto = {
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        analysis: {
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
        },
        mealType: MealType.LUNCH,
      };

      const mockMeal = {
        id: 'meal123',
        userId,
        imageUrl: dto.imageUrl,
        thumbnailUrl: dto.thumbnailUrl,
        foodName: 'Test Food',
        cuisine: 'Chinese',
        mealType: MealType.LUNCH,
        calories: 500,
        protein: 20,
        fat: 15,
        carbohydrates: 60,
        createdAt: new Date(),
        updatedAt: new Date(),
        isSynced: false,
        version: 1,
      };

      const mockDish = {
        id: 1,
        name: 'Test Food',
        cuisine: 'Chinese',
      };

      (prismaService.runTransaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx as any);
      });

      mockDishesService.findOrCreateAndUpdateInTx.mockResolvedValue(mockDish);
      mockTx.meal.create.mockResolvedValue(mockMeal);
      mockTx.cuisine_unlocks.findUnique.mockResolvedValue({ id: 1, mealCount: 5 });
      mockTx.daily_nutritions.findUnique.mockResolvedValue(null);
      mockTx.dish_unlocks.findUnique.mockResolvedValue(null);

      await service.create(userId, dto);

      expect(mockTx.cuisine_unlocks.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { mealCount: { increment: 1 }, lastMealAt: expect.any(Date) },
      });
    });
  });

  describe('getToday', () => {
    it('should return today\'s meals', async () => {
      const userId = 'userId123';
      const mockMeals = [
        {
          id: 'meal1',
          userId,
          imageUrl: 'https://example.com/image1.jpg',
          foodName: 'Food 1',
          cuisine: 'Chinese',
          mealType: MealType.BREAKFAST,
          createdAt: new Date(),
          analysis: {},
        },
      ];

      mockPrismaService.meal.findMany.mockResolvedValue(mockMeals);

      const result = await service.getToday(userId);

      expect(prismaService.meal.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          createdAt: { gte: expect.any(Date), lt: expect.any(Date) },
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return a single meal', async () => {
      const userId = 'userId123';
      const mealId = 'meal123';
      const mockMeal = {
        id: mealId,
        userId,
        imageUrl: 'https://example.com/image.jpg',
        foodName: 'Test Food',
        cuisine: 'Chinese',
        createdAt: new Date(),
        analysis: {},
      };

      mockPrismaService.meal.findFirst.mockResolvedValue(mockMeal);

      const result = await service.findOne(userId, mealId);

      expect(prismaService.meal.findFirst).toHaveBeenCalledWith({
        where: { id: mealId, userId, deletedAt: null },
      });
      expect(result).toHaveProperty('id', mealId);
    });

    it('should throw NotFoundException if meal not found', async () => {
      mockPrismaService.meal.findFirst.mockResolvedValue(null);

      await expect(service.findOne('userId123', 'meal123'))
        .rejects.toThrow('Meal not found');
    });
  });

  describe('update', () => {
    it('should update a meal', async () => {
      const userId = 'userId123';
      const mealId = 'meal123';
      const dto: UpdateMealDto = {
        notes: 'Updated notes',
      };

      const existingMeal = {
        id: mealId,
        userId,
        imageUrl: 'https://example.com/image.jpg',
        foodName: 'Test Food',
        cuisine: 'Chinese',
        deletedAt: null,
      };

      const updatedMeal = {
        ...existingMeal,
        notes: 'Updated notes',
        version: 2,
      };

      mockPrismaService.meal.findFirst.mockResolvedValue(existingMeal);
      mockPrismaService.meal.update.mockResolvedValue(updatedMeal);

      const result = await service.update(userId, mealId, dto);

      expect(prismaService.meal.update).toHaveBeenCalledWith({
        where: { id: mealId },
        data: { notes: 'Updated notes', version: { increment: 1 } },
      });
    });

    it('should throw NotFoundException if meal to update not found', async () => {
      mockPrismaService.meal.findFirst.mockResolvedValue(null);

      await expect(service.update('userId123', 'meal123', { notes: 'test' }))
        .rejects.toThrow('Meal not found');
    });
  });

  describe('remove', () => {
    it('should soft delete a meal', async () => {
      const userId = 'userId123';
      const mealId = 'meal123';

      const existingMeal = {
        id: mealId,
        userId,
        imageUrl: 'https://example.com/image.jpg',
        foodName: 'Test Food',
        cuisine: 'Chinese',
        deletedAt: null,
      };

      mockPrismaService.meal.findFirst.mockResolvedValue(existingMeal);
      mockPrismaService.meal.update.mockResolvedValue({ ...existingMeal, deletedAt: expect.any(Date) });

      await service.remove(userId, mealId);

      expect(prismaService.meal.update).toHaveBeenCalledWith({
        where: { id: mealId },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException if meal to delete not found', async () => {
      mockPrismaService.meal.findFirst.mockResolvedValue(null);

      await expect(service.remove('userId123', 'meal123'))
        .rejects.toThrow('Meal not found');
    });
  });

  describe('getByDate', () => {
    it('should return meals for a specific date', async () => {
      const userId = 'userId123';
      const date = new Date('2024-01-15T10:00:00Z');
      const mockMeals = [
        {
          id: 'meal1',
          userId,
          imageUrl: 'https://example.com/image.jpg',
          foodName: 'Food 1',
          cuisine: 'Chinese',
          createdAt: date,
          analysis: {},
        },
      ];

      mockPrismaService.meal.findMany.mockResolvedValue(mockMeals);

      const result = await service.getByDate(userId, date);

      expect(prismaService.meal.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          createdAt: { gte: expect.any(Date), lt: expect.any(Date) },
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('getByDishName', () => {
    it('should return meals and dish info for a specific dish', async () => {
      const userId = 'userId123';
      const foodName = 'Kung Pao Chicken';
      const mockMeals = [
        {
          id: 'meal1',
          userId,
          imageUrl: 'https://example.com/image.jpg',
          foodName,
          cuisine: 'Chinese',
          createdAt: new Date(),
          analysis: {},
        },
      ];

      const mockDish = {
        name: foodName,
        cuisine: 'Chinese',
        appearanceCount: 10,
        averageCalories: 450,
        averageProtein: 25,
        averageFat: 18,
        averageCarbs: 35,
        description: 'A classic Chinese dish',
        historicalOrigins: 'Sichuan cuisine',
      };

      mockPrismaService.meal.findMany.mockResolvedValue(mockMeals);
      mockPrismaService.dish.findUnique.mockResolvedValue(mockDish);

      const result = await service.getByDishName(userId, foodName);

      expect(result).toHaveProperty('meals');
      expect(result).toHaveProperty('dish');
      expect(result.meals).toHaveLength(1);
      expect(result.dish?.name).toBe(foodName);
    });
  });
});

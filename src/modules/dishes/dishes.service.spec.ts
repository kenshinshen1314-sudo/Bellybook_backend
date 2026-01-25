/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供菜品服务的测试用例
 * [POS]: dishes 模块的测试文件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Test, TestingModule } from '@nestjs/testing';
import { DishesService } from './dishes.service';
import { PrismaService } from '../../database/prisma.service';

describe('DishesService', () => {
  let service: DishesService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    dish: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    runTransaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DishesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DishesService>(DishesService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('getPopularDishes', () => {
    it('should return popular dishes with default limit', async () => {
      const mockDishes = [
        { name: 'Kung Pao Chicken', cuisine: 'Chinese', appearanceCount: 100 },
        { name: 'Mapo Tofu', cuisine: 'Chinese', appearanceCount: 80 },
      ];

      mockPrismaService.dish.findMany.mockResolvedValue(mockDishes as any);

      const result = await service.getPopularDishes();

      expect(prismaService.dish.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { appearanceCount: 'desc' },
        take: 10,
      });
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Kung Pao Chicken');
    });

    it('should filter by cuisine when provided', async () => {
      const mockDishes = [
        { name: 'Sushi', cuisine: 'Japanese', appearanceCount: 50 },
      ];

      mockPrismaService.dish.findMany.mockResolvedValue(mockDishes as any);

      await service.getPopularDishes(5, 'Japanese');

      expect(prismaService.dish.findMany).toHaveBeenCalledWith({
        where: { cuisine: 'Japanese' },
        orderBy: { appearanceCount: 'desc' },
        take: 5,
      });
    });

    it('should support custom limit', async () => {
      mockPrismaService.dish.findMany.mockResolvedValue([] as any);

      await service.getPopularDishes(20);

      expect(prismaService.dish.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      );
    });
  });

  describe('getDishByName', () => {
    it('should return dish by name', async () => {
      const mockDish = {
        name: 'Kung Pao Chicken',
        cuisine: 'Chinese',
        appearanceCount: 100,
        averageCalories: 500,
        description: 'Spicy Sichuan dish',
      };

      mockPrismaService.dish.findUnique.mockResolvedValue(mockDish as any);

      const result = await service.getDishByName('Kung Pao Chicken');

      expect(prismaService.dish.findUnique).toHaveBeenCalledWith({
        where: { name: 'Kung Pao Chicken' },
      });
      expect(result).toEqual(mockDish);
    });

    it('should return null for non-existent dish', async () => {
      mockPrismaService.dish.findUnique.mockResolvedValue(null);

      const result = await service.getDishByName('Non-existent Dish');

      expect(result).toBeNull();
    });
  });

  describe('findOrCreateAndUpdate', () => {
    it('should create transaction and call update method', async () => {
      const input = {
        foodName: 'Test Dish',
        cuisine: 'Chinese',
        nutrition: {
          calories: 500,
          protein: 20,
          fat: 15,
          carbohydrates: 60,
        },
      };

      const mockTx = {
        dish: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            name: 'Test Dish',
            cuisine: 'Chinese',
            appearanceCount: 1,
            averageCalories: 500,
          }),
        },
      };

      const mockDish = {
        name: 'Test Dish',
        cuisine: 'Chinese',
        appearanceCount: 1,
        averageCalories: 500,
      };

      mockPrismaService.runTransaction.mockImplementation(async (callback) => {
        return callback(mockTx as any);
      });

      const result = await service.findOrCreateAndUpdate(input as any);

      expect(prismaService.runTransaction).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.name).toBe('Test Dish');
    });
  });

  describe('findOrCreateAndUpdateInTx', () => {
    it('should create new dish if not exists', async () => {
      const mockTx = {
        dish: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            name: 'New Dish',
            cuisine: 'Chinese',
            appearanceCount: 1,
          }),
          update: jest.fn().mockResolvedValue({
            name: 'Updated Dish',
            cuisine: 'Chinese',
            appearanceCount: 2,
          }),
        },
      };

      const input = {
        foodName: 'New Dish',
        cuisine: 'Chinese',
        nutrition: { calories: 500, protein: 20, fat: 15, carbohydrates: 60 },
      };

      const result = await service['findOrCreateAndUpdateInTx'](mockTx as any, input as any);

      expect(mockTx.dish.findUnique).toHaveBeenCalledWith({
        where: { name: 'New Dish' },
      });
      expect(mockTx.dish.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Dish',
          cuisine: 'Chinese',
          appearanceCount: 1,
          averageCalories: 500,
          averageProtein: 20,
          averageFat: 15,
          averageCarbs: 60,
        }),
      });
      expect(result).toBeDefined();
    });

    it('should update existing dish with weighted average', async () => {
      const existingDish = {
        id: 'dish123',
        name: 'Existing Dish',
        cuisine: 'Chinese',
        appearanceCount: 10,
        averageCalories: 450,
        averageProtein: 18,
        averageFat: 12,
        averageCarbs: 55,
      };

      const updatedDish = {
        ...existingDish,
        appearanceCount: 11,
        averageCalories: 455, // Weighted average: (450*10 + 500*1) / 11
      };

      const mockTx = {
        dish: {
          findUnique: jest.fn().mockResolvedValue(existingDish),
          update: jest.fn().mockResolvedValue(updatedDish),
        },
      };

      const input = {
        foodName: 'Existing Dish',
        cuisine: 'Chinese',
        nutrition: { calories: 500, protein: 22, fat: 16, carbohydrates: 60 },
      };

      const result = await service['findOrCreateAndUpdateInTx'](mockTx as any, input as any);

      expect(mockTx.dish.findUnique).toHaveBeenCalledWith({
        where: { name: 'Existing Dish' },
      });
      expect(mockTx.dish.update).toHaveBeenCalledWith({
        where: { id: 'dish123' },
        data: expect.objectContaining({
          appearanceCount: 11,
          averageCalories: expect.any(Number),
        }),
      });
      expect(result).toBeDefined();
    });
  });
});

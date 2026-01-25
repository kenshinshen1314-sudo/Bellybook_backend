import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CacheStatsService } from '../cache/cache-stats.service';
import { DishInput } from '../ai/ai-types';
interface DishInputComplete extends DishInput {
    nutrition: {
        calories: number;
        protein: number;
        fat: number;
        carbohydrates: number;
    };
}
export declare class DishesService {
    private prisma;
    cacheService: CacheService;
    cacheStatsService: CacheStatsService;
    private readonly logger;
    constructor(prisma: PrismaService, cacheService: CacheService, cacheStatsService: CacheStatsService);
    findOrCreateAndUpdate(input: DishInputComplete): Promise<{
        name: string;
        description: string | null;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        cuisine: string;
        historicalOrigins: string | null;
        appearanceCount: number;
        averagePrice: number | null;
        averageCalories: number | null;
        averageProtein: number | null;
        averageFat: number | null;
        averageCarbs: number | null;
    }>;
    getPopularDishes(limit?: number, cuisine?: string): Promise<{
        name: string;
        description: string | null;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        cuisine: string;
        historicalOrigins: string | null;
        appearanceCount: number;
        averagePrice: number | null;
        averageCalories: number | null;
        averageProtein: number | null;
        averageFat: number | null;
        averageCarbs: number | null;
    }[]>;
    getDishByName(name: string): Promise<{
        name: string;
        description: string | null;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        cuisine: string;
        historicalOrigins: string | null;
        appearanceCount: number;
        averagePrice: number | null;
        averageCalories: number | null;
        averageProtein: number | null;
        averageFat: number | null;
        averageCarbs: number | null;
    } | null>;
    findOrCreateAndUpdateInTx(tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>, input: DishInputComplete): Promise<{
        name: string;
        description: string | null;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        cuisine: string;
        historicalOrigins: string | null;
        appearanceCount: number;
        averagePrice: number | null;
        averageCalories: number | null;
        averageProtein: number | null;
        averageFat: number | null;
        averageCarbs: number | null;
    }>;
    private updateWeightedAverage;
}
export {};

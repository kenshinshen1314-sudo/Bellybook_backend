import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
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
    private readonly logger;
    constructor(prisma: PrismaService);
    findOrCreateAndUpdate(input: DishInputComplete): Promise<{
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
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
        id: number;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
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
        id: number;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
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
        id: number;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
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

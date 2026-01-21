import { PrismaService } from '../../database/prisma.service';
import { DishInput } from '../ai/ai-types';
export declare class DishesService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    findOrCreateAndUpdate(input: DishInput): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
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
    getPopularDishes(limit?: number, cuisine?: string): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
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
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
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
}

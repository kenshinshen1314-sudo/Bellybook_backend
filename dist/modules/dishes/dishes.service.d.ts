import { PrismaService } from '../../database/prisma.service';
export declare class DishesService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    findOrCreateAndUpdate(foodName: string, cuisine: string, price?: number, calories?: number, protein?: number, fat?: number, carbohydrates?: number, description?: string, historicalOrigins?: string): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        cuisine: string;
        description: string | null;
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
        cuisine: string;
        description: string | null;
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
        cuisine: string;
        description: string | null;
        historicalOrigins: string | null;
        appearanceCount: number;
        averagePrice: number | null;
        averageCalories: number | null;
        averageProtein: number | null;
        averageFat: number | null;
        averageCarbs: number | null;
    } | null>;
}

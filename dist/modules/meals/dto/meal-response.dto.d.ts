import { MealAnalysis } from './create-meal.dto';
export declare class MealResponseDto {
    id: string;
    userId: string;
    imageUrl: string;
    thumbnailUrl?: string;
    analysis: MealAnalysis;
    mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    isSynced: boolean;
    version: number;
}
export declare class PaginatedMealsDto {
    data: MealResponseDto[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

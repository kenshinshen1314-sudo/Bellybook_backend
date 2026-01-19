export declare class MealQueryDto {
    page?: number;
    limit?: number;
    offset?: number;
    mealType?: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
    startDate?: string;
    endDate?: string;
    cuisine?: string;
    sortBy?: 'createdAt' | 'calories' | 'protein';
    sortOrder?: 'asc' | 'desc';
}

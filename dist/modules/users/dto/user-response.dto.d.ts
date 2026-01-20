export declare class ProfileResponseDto {
    id: string;
    username: string;
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    createdAt: Date;
}
export declare class SettingsResponseDto {
    language: 'ZH' | 'EN';
    theme: 'LIGHT' | 'DARK' | 'AUTO';
    notificationsEnabled: boolean;
    breakfastReminderTime?: string;
    lunchReminderTime?: string;
    dinnerReminderTime?: string;
    hideRanking: boolean;
}
export declare class FavoriteCuisine {
    name: string;
    count: number;
}
export declare class UserStatsDto {
    totalMeals: number;
    totalCuisines: number;
    currentStreak: number;
    longestStreak: number;
    thisWeekMeals: number;
    thisMonthMeals: number;
    favoriteCuisines: FavoriteCuisine[];
}

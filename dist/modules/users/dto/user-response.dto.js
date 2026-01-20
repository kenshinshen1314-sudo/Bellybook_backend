"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserStatsDto = exports.FavoriteCuisine = exports.SettingsResponseDto = exports.ProfileResponseDto = void 0;
class ProfileResponseDto {
    id;
    username;
    displayName;
    bio;
    avatarUrl;
    createdAt;
}
exports.ProfileResponseDto = ProfileResponseDto;
class SettingsResponseDto {
    language;
    theme;
    notificationsEnabled;
    breakfastReminderTime;
    lunchReminderTime;
    dinnerReminderTime;
    hideRanking;
}
exports.SettingsResponseDto = SettingsResponseDto;
class FavoriteCuisine {
    name;
    count;
}
exports.FavoriteCuisine = FavoriteCuisine;
class UserStatsDto {
    totalMeals;
    totalCuisines;
    currentStreak;
    longestStreak;
    thisWeekMeals;
    thisMonthMeals;
    favoriteCuisines;
}
exports.UserStatsDto = UserStatsDto;
//# sourceMappingURL=user-response.dto.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserUnlockedDishesDto = exports.UnlockedDishEntry = exports.AllUsersDishesDto = exports.UserCuisineStats = exports.CuisineExpertDetailDto = exports.CuisineExpertDishEntry = exports.DishExpertsDto = exports.DishExpertEntry = exports.RankingStatsDto = exports.GourmetsDto = exports.GourmetEntry = exports.LeaderboardDto = exports.LeaderboardEntry = exports.CuisineMastersDto = exports.CuisineMasterEntry = void 0;
const swagger_1 = require("@nestjs/swagger");
class CuisineMasterEntry {
    rank;
    userId;
    username;
    avatarUrl;
    cuisineName;
    mealCount;
    firstMealAt;
}
exports.CuisineMasterEntry = CuisineMasterEntry;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '排名', example: 1 }),
    __metadata("design:type", Number)
], CuisineMasterEntry.prototype, "rank", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户 ID', example: 'cm1234567890' }),
    __metadata("design:type", String)
], CuisineMasterEntry.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户名', example: 'username' }),
    __metadata("design:type", String)
], CuisineMasterEntry.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '头像 URL', required: false, nullable: true }),
    __metadata("design:type", Object)
], CuisineMasterEntry.prototype, "avatarUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '菜系名称', example: '川菜' }),
    __metadata("design:type", String)
], CuisineMasterEntry.prototype, "cuisineName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '餐食数量', example: 25 }),
    __metadata("design:type", Number)
], CuisineMasterEntry.prototype, "mealCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '首次记录时间', example: '2024-01-01T00:00:00.000Z' }),
    __metadata("design:type", String)
], CuisineMasterEntry.prototype, "firstMealAt", void 0);
class CuisineMastersDto {
    cuisineName;
    period;
    masters;
}
exports.CuisineMastersDto = CuisineMastersDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '菜系名称', required: false, example: '川菜' }),
    __metadata("design:type", String)
], CuisineMastersDto.prototype, "cuisineName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '时间段', example: 'ALL_TIME' }),
    __metadata("design:type", String)
], CuisineMastersDto.prototype, "period", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '菜系专家列表', type: [CuisineMasterEntry] }),
    __metadata("design:type", Array)
], CuisineMastersDto.prototype, "masters", void 0);
class LeaderboardEntry {
    rank;
    userId;
    username;
    avatarUrl;
    score;
    mealCount;
    cuisineCount;
}
exports.LeaderboardEntry = LeaderboardEntry;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '排名', example: 1 }),
    __metadata("design:type", Number)
], LeaderboardEntry.prototype, "rank", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户 ID', example: 'cm1234567890' }),
    __metadata("design:type", String)
], LeaderboardEntry.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户名', example: 'username' }),
    __metadata("design:type", String)
], LeaderboardEntry.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '头像 URL', required: false, nullable: true }),
    __metadata("design:type", Object)
], LeaderboardEntry.prototype, "avatarUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '综合得分', example: 500 }),
    __metadata("design:type", Number)
], LeaderboardEntry.prototype, "score", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '餐食数量', example: 30 }),
    __metadata("design:type", Number)
], LeaderboardEntry.prototype, "mealCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '解锁菜系数量', example: 5 }),
    __metadata("design:type", Number)
], LeaderboardEntry.prototype, "cuisineCount", void 0);
class LeaderboardDto {
    period;
    tier;
    leaderboard;
}
exports.LeaderboardDto = LeaderboardDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '时间段', example: 'ALL_TIME' }),
    __metadata("design:type", String)
], LeaderboardDto.prototype, "period", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '会员等级', required: false, enum: ['FREE', 'PREMIUM', 'PRO'] }),
    __metadata("design:type", String)
], LeaderboardDto.prototype, "tier", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '排行榜列表', type: [LeaderboardEntry] }),
    __metadata("design:type", Array)
], LeaderboardDto.prototype, "leaderboard", void 0);
class GourmetEntry {
    rank;
    userId;
    username;
    avatarUrl;
    cuisineCount;
    mealCount;
    cuisines;
}
exports.GourmetEntry = GourmetEntry;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '排名', example: 1 }),
    __metadata("design:type", Number)
], GourmetEntry.prototype, "rank", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户 ID', example: 'cm1234567890' }),
    __metadata("design:type", String)
], GourmetEntry.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户名', example: 'username' }),
    __metadata("design:type", String)
], GourmetEntry.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '头像 URL', required: false, nullable: true }),
    __metadata("design:type", Object)
], GourmetEntry.prototype, "avatarUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '解锁菜系数量', example: 8 }),
    __metadata("design:type", Number)
], GourmetEntry.prototype, "cuisineCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '餐食数量', example: 45 }),
    __metadata("design:type", Number)
], GourmetEntry.prototype, "mealCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '菜系列表', type: [String], example: ['川菜', '湘菜', '粤菜'] }),
    __metadata("design:type", Array)
], GourmetEntry.prototype, "cuisines", void 0);
class GourmetsDto {
    period;
    gourmets;
}
exports.GourmetsDto = GourmetsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '时间段', example: 'ALL_TIME' }),
    __metadata("design:type", String)
], GourmetsDto.prototype, "period", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '美食家列表', type: [GourmetEntry] }),
    __metadata("design:type", Array)
], GourmetsDto.prototype, "gourmets", void 0);
class RankingStatsDto {
    period;
    totalUsers;
    activeUsers;
    totalMeals;
    totalCuisines;
    avgMealsPerUser;
}
exports.RankingStatsDto = RankingStatsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '时间段', example: 'ALL_TIME' }),
    __metadata("design:type", String)
], RankingStatsDto.prototype, "period", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '总用户数', example: 150 }),
    __metadata("design:type", Number)
], RankingStatsDto.prototype, "totalUsers", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '活跃用户数', example: 80 }),
    __metadata("design:type", Number)
], RankingStatsDto.prototype, "activeUsers", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '总餐食数', example: 2500 }),
    __metadata("design:type", Number)
], RankingStatsDto.prototype, "totalMeals", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '解锁菜系总数', example: 500 }),
    __metadata("design:type", Number)
], RankingStatsDto.prototype, "totalCuisines", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '平均每用户餐食数', example: 16.67 }),
    __metadata("design:type", Number)
], RankingStatsDto.prototype, "avgMealsPerUser", void 0);
class DishExpertEntry {
    rank;
    userId;
    username;
    avatarUrl;
    dishCount;
    mealCount;
    dishes;
    cuisines;
}
exports.DishExpertEntry = DishExpertEntry;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '排名', example: 1 }),
    __metadata("design:type", Number)
], DishExpertEntry.prototype, "rank", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户 ID', example: 'cm1234567890' }),
    __metadata("design:type", String)
], DishExpertEntry.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户名', example: 'username' }),
    __metadata("design:type", String)
], DishExpertEntry.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '头像 URL', required: false, nullable: true }),
    __metadata("design:type", Object)
], DishExpertEntry.prototype, "avatarUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '解锁菜品数量', example: 35 }),
    __metadata("design:type", Number)
], DishExpertEntry.prototype, "dishCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '餐食数量', example: 50 }),
    __metadata("design:type", Number)
], DishExpertEntry.prototype, "mealCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '菜品列表', type: [String], example: ['宫保鸡丁', '麻婆豆腐', '鱼香肉丝'] }),
    __metadata("design:type", Array)
], DishExpertEntry.prototype, "dishes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '菜系列表', type: [String], example: ['川菜', '湘菜'] }),
    __metadata("design:type", Array)
], DishExpertEntry.prototype, "cuisines", void 0);
class DishExpertsDto {
    period;
    experts;
}
exports.DishExpertsDto = DishExpertsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '时间段', example: 'ALL_TIME' }),
    __metadata("design:type", String)
], DishExpertsDto.prototype, "period", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '菜品专家列表', type: [DishExpertEntry] }),
    __metadata("design:type", Array)
], DishExpertsDto.prototype, "experts", void 0);
class CuisineExpertDishEntry {
    dishName;
    cuisine;
    mealCount;
    firstMealAt;
    lastMealAt;
    imageUrl;
    calories;
    notes;
}
exports.CuisineExpertDishEntry = CuisineExpertDishEntry;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '菜品名称', example: '宫保鸡丁' }),
    __metadata("design:type", String)
], CuisineExpertDishEntry.prototype, "dishName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '菜系', example: '川菜' }),
    __metadata("design:type", String)
], CuisineExpertDishEntry.prototype, "cuisine", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '餐食数量', example: 5 }),
    __metadata("design:type", Number)
], CuisineExpertDishEntry.prototype, "mealCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '首次记录时间', example: '2024-01-01T00:00:00.000Z' }),
    __metadata("design:type", String)
], CuisineExpertDishEntry.prototype, "firstMealAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '最后记录时间', required: false }),
    __metadata("design:type", String)
], CuisineExpertDishEntry.prototype, "lastMealAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '图片 URL', required: false }),
    __metadata("design:type", String)
], CuisineExpertDishEntry.prototype, "imageUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '卡路里', required: false }),
    __metadata("design:type", Number)
], CuisineExpertDishEntry.prototype, "calories", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '备注', required: false }),
    __metadata("design:type", String)
], CuisineExpertDishEntry.prototype, "notes", void 0);
class CuisineExpertDetailDto {
    userId;
    username;
    avatarUrl;
    cuisineName;
    period;
    totalDishes;
    totalMeals;
    dishes;
    offset;
    limit;
    hasMore;
}
exports.CuisineExpertDetailDto = CuisineExpertDetailDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户 ID', example: 'cm1234567890' }),
    __metadata("design:type", String)
], CuisineExpertDetailDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户名', example: 'username' }),
    __metadata("design:type", String)
], CuisineExpertDetailDto.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '头像 URL', required: false, nullable: true }),
    __metadata("design:type", Object)
], CuisineExpertDetailDto.prototype, "avatarUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '菜系名称', example: '川菜' }),
    __metadata("design:type", String)
], CuisineExpertDetailDto.prototype, "cuisineName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '时间段', example: 'ALL_TIME' }),
    __metadata("design:type", String)
], CuisineExpertDetailDto.prototype, "period", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '总菜品数', example: 15 }),
    __metadata("design:type", Number)
], CuisineExpertDetailDto.prototype, "totalDishes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '总餐食数', example: 25 }),
    __metadata("design:type", Number)
], CuisineExpertDetailDto.prototype, "totalMeals", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '菜品列表', type: [CuisineExpertDishEntry] }),
    __metadata("design:type", Array)
], CuisineExpertDetailDto.prototype, "dishes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '分页：当前页偏移量', required: false }),
    __metadata("design:type", Number)
], CuisineExpertDetailDto.prototype, "offset", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '分页：每页条目数', required: false }),
    __metadata("design:type", Number)
], CuisineExpertDetailDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '分页：是否有更多数据', required: false }),
    __metadata("design:type", Boolean)
], CuisineExpertDetailDto.prototype, "hasMore", void 0);
class UserCuisineStats {
    rank;
    userId;
    username;
    avatarUrl;
    cuisineName;
    dishCount;
    mealCount;
    firstMealAt;
}
exports.UserCuisineStats = UserCuisineStats;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '排名', example: 1 }),
    __metadata("design:type", Number)
], UserCuisineStats.prototype, "rank", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户 ID', example: 'cm1234567890' }),
    __metadata("design:type", String)
], UserCuisineStats.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户名', example: 'username' }),
    __metadata("design:type", String)
], UserCuisineStats.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '头像 URL', required: false, nullable: true }),
    __metadata("design:type", Object)
], UserCuisineStats.prototype, "avatarUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '菜系名称', example: '川菜' }),
    __metadata("design:type", String)
], UserCuisineStats.prototype, "cuisineName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '菜品数量', example: 8 }),
    __metadata("design:type", Number)
], UserCuisineStats.prototype, "dishCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '餐食数量', example: 12 }),
    __metadata("design:type", Number)
], UserCuisineStats.prototype, "mealCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '首次记录时间', example: '2024-01-01T00:00:00.000Z' }),
    __metadata("design:type", String)
], UserCuisineStats.prototype, "firstMealAt", void 0);
class AllUsersDishesDto {
    period;
    totalEntries;
    totalUsers;
    totalCuisines;
    entries;
}
exports.AllUsersDishesDto = AllUsersDishesDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '时间段', example: 'WEEKLY' }),
    __metadata("design:type", String)
], AllUsersDishesDto.prototype, "period", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '总条目数', example: 150 }),
    __metadata("design:type", Number)
], AllUsersDishesDto.prototype, "totalEntries", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '总用户数', example: 50 }),
    __metadata("design:type", Number)
], AllUsersDishesDto.prototype, "totalUsers", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '涉及菜系数', example: 8 }),
    __metadata("design:type", Number)
], AllUsersDishesDto.prototype, "totalCuisines", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户菜系统计列表', type: [UserCuisineStats] }),
    __metadata("design:type", Array)
], AllUsersDishesDto.prototype, "entries", void 0);
class UnlockedDishEntry {
    dishName;
    cuisine;
    mealCount;
    firstMealAt;
    lastMealAt;
    imageUrl;
    calories;
}
exports.UnlockedDishEntry = UnlockedDishEntry;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '菜品名称', example: '宫保鸡丁' }),
    __metadata("design:type", String)
], UnlockedDishEntry.prototype, "dishName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '菜系', example: '川菜' }),
    __metadata("design:type", String)
], UnlockedDishEntry.prototype, "cuisine", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '餐食数量', example: 3 }),
    __metadata("design:type", Number)
], UnlockedDishEntry.prototype, "mealCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '首次记录时间', example: '2024-01-01T00:00:00.000Z' }),
    __metadata("design:type", String)
], UnlockedDishEntry.prototype, "firstMealAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '最后记录时间', example: '2024-01-15T00:00:00.000Z' }),
    __metadata("design:type", String)
], UnlockedDishEntry.prototype, "lastMealAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '图片 URL', required: false }),
    __metadata("design:type", String)
], UnlockedDishEntry.prototype, "imageUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '卡路里', required: false }),
    __metadata("design:type", Number)
], UnlockedDishEntry.prototype, "calories", void 0);
class UserUnlockedDishesDto {
    userId;
    username;
    avatarUrl;
    totalDishes;
    totalMeals;
    dishes;
    offset;
    limit;
    hasMore;
}
exports.UserUnlockedDishesDto = UserUnlockedDishesDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户 ID', example: 'cm1234567890' }),
    __metadata("design:type", String)
], UserUnlockedDishesDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户名', example: 'username' }),
    __metadata("design:type", String)
], UserUnlockedDishesDto.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '头像 URL', required: false, nullable: true }),
    __metadata("design:type", Object)
], UserUnlockedDishesDto.prototype, "avatarUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '总菜品数', example: 25 }),
    __metadata("design:type", Number)
], UserUnlockedDishesDto.prototype, "totalDishes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '总餐食数', example: 40 }),
    __metadata("design:type", Number)
], UserUnlockedDishesDto.prototype, "totalMeals", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '已解锁菜品列表', type: [UnlockedDishEntry] }),
    __metadata("design:type", Array)
], UserUnlockedDishesDto.prototype, "dishes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '分页：当前页偏移量', required: false }),
    __metadata("design:type", Number)
], UserUnlockedDishesDto.prototype, "offset", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '分页：每页条目数', required: false }),
    __metadata("design:type", Number)
], UserUnlockedDishesDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '分页：是否有更多数据', required: false }),
    __metadata("design:type", Boolean)
], UserUnlockedDishesDto.prototype, "hasMore", void 0);
//# sourceMappingURL=ranking-response.dto.js.map
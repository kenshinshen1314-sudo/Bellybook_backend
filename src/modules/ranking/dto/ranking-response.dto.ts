import { ApiProperty } from '@nestjs/swagger';

export class CuisineMasterEntry {
  @ApiProperty({ description: '排名', example: 1 })
  rank!: number;

  @ApiProperty({ description: '用户 ID', example: 'cm1234567890' })
  userId!: string;

  @ApiProperty({ description: '用户名', example: 'username' })
  username!: string;

  @ApiProperty({ description: '头像 URL', required: false, nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ description: '菜系名称', example: '川菜' })
  cuisineName!: string;

  @ApiProperty({ description: '餐食数量', example: 25 })
  mealCount!: number;

  @ApiProperty({ description: '首次记录时间', example: '2024-01-01T00:00:00.000Z' })
  firstMealAt!: string;
}

export class CuisineMastersDto {
  @ApiProperty({ description: '菜系名称', required: false, example: '川菜' })
  cuisineName?: string;

  @ApiProperty({ description: '时间段', example: 'ALL_TIME' })
  period!: string;

  @ApiProperty({ description: '菜系专家列表', type: [CuisineMasterEntry] })
  masters!: CuisineMasterEntry[];
}

export class LeaderboardEntry {
  @ApiProperty({ description: '排名', example: 1 })
  rank!: number;

  @ApiProperty({ description: '用户 ID', example: 'cm1234567890' })
  userId!: string;

  @ApiProperty({ description: '用户名', example: 'username' })
  username!: string;

  @ApiProperty({ description: '头像 URL', required: false, nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ description: '综合得分', example: 500 })
  score!: number;

  @ApiProperty({ description: '餐食数量', example: 30 })
  mealCount!: number;

  @ApiProperty({ description: '解锁菜系数量', example: 5 })
  cuisineCount!: number;
}

export class LeaderboardDto {
  @ApiProperty({ description: '时间段', example: 'ALL_TIME' })
  period!: string;

  @ApiProperty({ description: '会员等级', required: false, enum: ['FREE', 'PREMIUM', 'PRO'] })
  tier?: string;

  @ApiProperty({ description: '排行榜列表', type: [LeaderboardEntry] })
  leaderboard!: LeaderboardEntry[];
}

export class GourmetEntry {
  @ApiProperty({ description: '排名', example: 1 })
  rank!: number;

  @ApiProperty({ description: '用户 ID', example: 'cm1234567890' })
  userId!: string;

  @ApiProperty({ description: '用户名', example: 'username' })
  username!: string;

  @ApiProperty({ description: '头像 URL', required: false, nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ description: '解锁菜系数量', example: 8 })
  cuisineCount!: number;

  @ApiProperty({ description: '餐食数量', example: 45 })
  mealCount!: number;

  @ApiProperty({ description: '菜系列表', type: [String], example: ['川菜', '湘菜', '粤菜'] })
  cuisines!: string[];
}

export class GourmetsDto {
  @ApiProperty({ description: '时间段', example: 'ALL_TIME' })
  period!: string;

  @ApiProperty({ description: '美食家列表', type: [GourmetEntry] })
  gourmets!: GourmetEntry[];
}

export class RankingStatsDto {
  @ApiProperty({ description: '时间段', example: 'ALL_TIME' })
  period!: string;

  @ApiProperty({ description: '总用户数', example: 150 })
  totalUsers!: number;

  @ApiProperty({ description: '活跃用户数', example: 80 })
  activeUsers!: number;

  @ApiProperty({ description: '总餐食数', example: 2500 })
  totalMeals!: number;

  @ApiProperty({ description: '解锁菜系总数', example: 500 })
  totalCuisines!: number;

  @ApiProperty({ description: '平均每用户餐食数', example: 16.67 })
  avgMealsPerUser!: number;
}

export class DishExpertEntry {
  @ApiProperty({ description: '排名', example: 1 })
  rank!: number;

  @ApiProperty({ description: '用户 ID', example: 'cm1234567890' })
  userId!: string;

  @ApiProperty({ description: '用户名', example: 'username' })
  username!: string;

  @ApiProperty({ description: '头像 URL', required: false, nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ description: '解锁菜品数量', example: 35 })
  dishCount!: number;

  @ApiProperty({ description: '餐食数量', example: 50 })
  mealCount!: number;

  @ApiProperty({ description: '菜品列表', type: [String], example: ['宫保鸡丁', '麻婆豆腐', '鱼香肉丝'] })
  dishes!: string[];

  @ApiProperty({ description: '菜系列表', type: [String], example: ['川菜', '湘菜'] })
  cuisines!: string[];
}

export class DishExpertsDto {
  @ApiProperty({ description: '时间段', example: 'ALL_TIME' })
  period!: string;

  @ApiProperty({ description: '菜品专家列表', type: [DishExpertEntry] })
  experts!: DishExpertEntry[];
}

export class CuisineExpertDishEntry {
  @ApiProperty({ description: '菜品名称', example: '宫保鸡丁' })
  dishName!: string;

  @ApiProperty({ description: '菜系', example: '川菜' })
  cuisine!: string;

  @ApiProperty({ description: '餐食数量', example: 5 })
  mealCount!: number;

  @ApiProperty({ description: '首次记录时间', example: '2024-01-01T00:00:00.000Z' })
  firstMealAt!: string;

  @ApiProperty({ description: '最后记录时间', required: false })
  lastMealAt?: string;

  @ApiProperty({ description: '图片 URL', required: false })
  imageUrl?: string;

  @ApiProperty({ description: '卡路里', required: false })
  calories?: number;

  @ApiProperty({ description: '备注', required: false })
  notes?: string;
}

export class CuisineExpertDetailDto {
  @ApiProperty({ description: '用户 ID', example: 'cm1234567890' })
  userId!: string;

  @ApiProperty({ description: '用户名', example: 'username' })
  username!: string;

  @ApiProperty({ description: '头像 URL', required: false, nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ description: '菜系名称', example: '川菜' })
  cuisineName!: string;

  @ApiProperty({ description: '时间段', example: 'ALL_TIME' })
  period!: string;

  @ApiProperty({ description: '总菜品数', example: 15 })
  totalDishes!: number;

  @ApiProperty({ description: '总餐食数', example: 25 })
  totalMeals!: number;

  @ApiProperty({ description: '菜品列表', type: [CuisineExpertDishEntry] })
  dishes!: CuisineExpertDishEntry[];
}

/**
 * 用户+菜系统计数据
 * 用于展示每个用户在各个菜系下的菜品数量
 */
export class UserCuisineStats {
  @ApiProperty({ description: '排名', example: 1 })
  rank!: number;

  @ApiProperty({ description: '用户 ID', example: 'cm1234567890' })
  userId!: string;

  @ApiProperty({ description: '用户名', example: 'username' })
  username!: string;

  @ApiProperty({ description: '头像 URL', required: false, nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ description: '菜系名称', example: '川菜' })
  cuisineName!: string;

  @ApiProperty({ description: '菜品数量', example: 8 })
  dishCount!: number;

  @ApiProperty({ description: '餐食数量', example: 12 })
  mealCount!: number;

  @ApiProperty({ description: '首次记录时间', example: '2024-01-01T00:00:00.000Z' })
  firstMealAt!: string;
}

export class AllUsersDishesDto {
  @ApiProperty({ description: '时间段', example: 'WEEKLY' })
  period!: string;

  @ApiProperty({ description: '总条目数', example: 150 })
  totalEntries!: number;

  @ApiProperty({ description: '总用户数', example: 50 })
  totalUsers!: number;

  @ApiProperty({ description: '涉及菜系数', example: 8 })
  totalCuisines!: number;

  @ApiProperty({ description: '用户菜系统计列表', type: [UserCuisineStats] })
  entries!: UserCuisineStats[];
}

/**
 * 用户已解锁的菜肴
 */
export class UnlockedDishEntry {
  @ApiProperty({ description: '菜品名称', example: '宫保鸡丁' })
  dishName!: string;

  @ApiProperty({ description: '菜系', example: '川菜' })
  cuisine!: string;

  @ApiProperty({ description: '餐食数量', example: 3 })
  mealCount!: number;

  @ApiProperty({ description: '首次记录时间', example: '2024-01-01T00:00:00.000Z' })
  firstMealAt!: string;

  @ApiProperty({ description: '最后记录时间', example: '2024-01-15T00:00:00.000Z' })
  lastMealAt!: string;

  @ApiProperty({ description: '图片 URL', required: false })
  imageUrl?: string;

  @ApiProperty({ description: '卡路里', required: false })
  calories?: number;
}

/**
 * 用户已解锁菜肴响应
 */
export class UserUnlockedDishesDto {
  @ApiProperty({ description: '用户 ID', example: 'cm1234567890' })
  userId!: string;

  @ApiProperty({ description: '用户名', example: 'username' })
  username!: string;

  @ApiProperty({ description: '头像 URL', required: false, nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ description: '总菜品数', example: 25 })
  totalDishes!: number;

  @ApiProperty({ description: '总餐食数', example: 40 })
  totalMeals!: number;

  @ApiProperty({ description: '已解锁菜品列表', type: [UnlockedDishEntry] })
  dishes!: UnlockedDishEntry[];
}

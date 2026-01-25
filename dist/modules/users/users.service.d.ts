import { PrismaService } from '../../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ProfileResponseDto, SettingsResponseDto, UserStatsDto } from './dto/user-response.dto';
import { CacheService } from '../cache/cache.service';
import { CacheStatsService } from '../cache/cache-stats.service';
export declare class UsersService {
    private prisma;
    cacheService: CacheService;
    cacheStatsService: CacheStatsService;
    private readonly logger;
    constructor(prisma: PrismaService, cacheService: CacheService, cacheStatsService: CacheStatsService);
    checkAnalysisQuota(userId: string): Promise<{
        allowed: boolean;
        remaining: number;
        limit: number;
    }>;
    incrementAnalysisCount(userId: string): Promise<void>;
    getProfile(userId: string): Promise<ProfileResponseDto>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<ProfileResponseDto>;
    getSettings(userId: string): Promise<SettingsResponseDto>;
    updateSettings(userId: string, dto: UpdateSettingsDto): Promise<SettingsResponseDto>;
    getStats(userId: string): Promise<UserStatsDto>;
    deleteAccount(userId: string): Promise<void>;
    private buildUserUpsertCreate;
    private getStartOfDay;
    private calculateStreakOptimized;
    private calculateLongestStreakOptimized;
    private calculateStreak;
    private calculateLongestStreak;
    private mapToProfileResponse;
    private mapToSettingsResponse;
}

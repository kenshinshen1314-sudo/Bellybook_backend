import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ProfileResponseDto, SettingsResponseDto, UserStatsDto } from './dto/user-response.dto';
import { SuccessResponse } from '../../common/dto/response.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(userId: string): Promise<ProfileResponseDto>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<ProfileResponseDto>;
    getSettings(userId: string): Promise<SettingsResponseDto>;
    updateSettings(userId: string, dto: UpdateSettingsDto): Promise<SettingsResponseDto>;
    getStats(userId: string): Promise<UserStatsDto>;
    deleteAccount(userId: string): Promise<SuccessResponse>;
}

import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ProfileResponseDto, SettingsResponseDto, UserStatsDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SuccessResponse } from '../../common/dto/response.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@CurrentUser('userId') userId: string): Promise<ProfileResponseDto> {
    return this.usersService.getProfile(userId);
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('settings')
  async getSettings(@CurrentUser('userId') userId: string): Promise<SettingsResponseDto> {
    return this.usersService.getSettings(userId);
  }

  @Put('settings')
  async updateSettings(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateSettingsDto,
  ): Promise<SettingsResponseDto> {
    return this.usersService.updateSettings(userId, dto);
  }

  @Get('stats')
  async getStats(@CurrentUser('userId') userId: string): Promise<UserStatsDto> {
    return this.usersService.getStats(userId);
  }

  @Delete('account')
  async deleteAccount(@CurrentUser('userId') userId: string): Promise<SuccessResponse> {
    await this.usersService.deleteAccount(userId);
    return new SuccessResponse(null, 'Account deleted successfully');
  }
}

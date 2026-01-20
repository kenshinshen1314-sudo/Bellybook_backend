import { IsEnum, IsOptional, IsString, Matches, IsBoolean } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsEnum(['ZH', 'EN'])
  language?: 'ZH' | 'EN';

  @IsOptional()
  @IsEnum(['LIGHT', 'DARK', 'AUTO'])
  theme?: 'LIGHT' | 'DARK' | 'AUTO';

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  breakfastReminderTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  lunchReminderTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  dinnerReminderTime?: string;

  @IsOptional()
  @IsBoolean()
  hideRanking?: boolean;
}

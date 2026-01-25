import { IsEnum, IsOptional, IsString, Matches, IsBoolean } from 'class-validator';

/**
 * 有效时间格式正则 (HH:MM, 00-23小时, 00-59分钟)
 */
const VALID_TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class UpdateSettingsDto {
  @IsOptional()
  @IsEnum(['ZH', 'EN'], {
    message: 'language must be either "ZH" or "EN"'
  })
  language?: 'ZH' | 'EN';

  @IsOptional()
  @IsEnum(['LIGHT', 'DARK', 'AUTO'], {
    message: 'theme must be one of: LIGHT, DARK, AUTO'
  })
  theme?: 'LIGHT' | 'DARK' | 'AUTO';

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @IsOptional()
  @IsString()
  @Matches(VALID_TIME_REGEX, {
    message: 'breakfastReminderTime must be in HH:MM format (00:00-23:59)'
  })
  breakfastReminderTime?: string;

  @IsOptional()
  @IsString()
  @Matches(VALID_TIME_REGEX, {
    message: 'lunchReminderTime must be in HH:MM format (00:00-23:59)'
  })
  lunchReminderTime?: string;

  @IsOptional()
  @IsString()
  @Matches(VALID_TIME_REGEX, {
    message: 'dinnerReminderTime must be in HH:MM format (00:00-23:59)'
  })
  dinnerReminderTime?: string;

  @IsOptional()
  @IsBoolean()
  hideRanking?: boolean;
}

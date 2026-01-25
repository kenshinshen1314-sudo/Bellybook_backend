import { IsOptional, IsEnum, IsString, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ISO 8601 日期格式正则（YYYY-MM-DD）
 */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 日期格式验证装饰器
 */
function IsDateFormat() {
  return function (target: any, propertyKey: string) {
    IsDateString()(target, propertyKey);
    // Note: IsDateString already validates ISO 8601 format
  };
}

export class MealQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100) // 防止过大 limit 导致性能问题
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsEnum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'], {
    message: 'mealType must be one of: BREAKFAST, LUNCH, DINNER, SNACK'
  })
  mealType?: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

  @IsOptional()
  @IsDateString({}, {
    message: 'startDate must be a valid ISO 8601 date string (YYYY-MM-DD)'
  })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, {
    message: 'endDate must be a valid ISO 8601 date string (YYYY-MM-DD)'
  })
  endDate?: string;

  @IsOptional()
  @IsString()
  cuisine?: string;

  @IsOptional()
  @IsEnum(['createdAt', 'calories', 'protein'], {
    message: 'sortBy must be one of: createdAt, calories, protein'
  })
  sortBy?: 'createdAt' | 'calories' | 'protein';

  @IsOptional()
  @IsEnum(['asc', 'desc'], {
    message: 'sortOrder must be either "asc" or "desc"'
  })
  sortOrder?: 'asc' | 'desc';
}

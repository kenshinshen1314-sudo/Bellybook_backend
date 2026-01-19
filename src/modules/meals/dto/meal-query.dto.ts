import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

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
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsEnum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'])
  mealType?: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  cuisine?: string;

  @IsOptional()
  @IsEnum(['createdAt', 'calories', 'protein'])
  sortBy?: 'createdAt' | 'calories' | 'protein';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

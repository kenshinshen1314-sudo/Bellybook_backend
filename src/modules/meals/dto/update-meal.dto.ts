import { IsOptional, IsEnum, IsString, MaxLength } from 'class-validator';

export class UpdateMealDto {
  @IsOptional()
  @IsEnum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'])
  mealType?: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

import { IsString, IsUrl, IsOptional, IsEnum, MaxLength, ValidateNested, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class Nutrition {
  @IsNumber()
  calories!: number;

  @IsNumber()
  protein!: number;

  @IsNumber()
  fat!: number;

  @IsNumber()
  carbohydrates!: number;

  @IsOptional()
  @IsNumber()
  fiber?: number;

  @IsOptional()
  @IsNumber()
  sugar?: number;

  @IsOptional()
  @IsNumber()
  sodium?: number;
}

export class Ingredient {
  @IsString()
  name!: string;

  @IsNumber()
  percentage!: number;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class MealAnalysis {
  @IsString()
  foodName!: string;

  @IsString()
  cuisine!: string;

  @IsOptional()
  @IsString()
  plating?: string;

  @IsOptional()
  @IsString()
  sensory?: string;

  @IsOptional()
  @IsString()
  container?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @ValidateNested()
  nutrition!: Nutrition;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredients?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestions?: string[];

  @IsOptional()
  @IsString()
  poeticDescription?: string;

  @IsOptional()
  @IsString()
  foodNamePoetic?: string;

  @IsOptional()
  @IsNumber()
  foodPrice?: number;

  @IsOptional()
  @IsString()
  historicalOrigins?: string;

  @IsOptional()
  @IsString()
  nutritionCommentary?: string;

  @IsString()
  analyzedAt!: string;
}

export class CreateMealDto {
  @IsUrl()
  imageUrl!: string;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ValidateNested()
  @Type(() => MealAnalysis)
  analysis!: MealAnalysis;

  @IsOptional()
  @IsEnum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'])
  mealType?: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

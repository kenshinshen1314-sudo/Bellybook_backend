import { IsEnum, IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum RankingPeriod {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  ALL_TIME = 'ALL_TIME',
}

export class CuisineMastersQueryDto {
  @IsOptional()
  @IsString()
  cuisineName?: string;

  @IsOptional()
  @IsEnum(RankingPeriod, {
    message: 'period must be one of: WEEKLY, MONTHLY, YEARLY, ALL_TIME'
  })
  period?: RankingPeriod;
}

export class LeaderboardQueryDto {
  @IsOptional()
  @IsEnum(RankingPeriod, {
    message: 'period must be one of: WEEKLY, MONTHLY, YEARLY, ALL_TIME'
  })
  period?: RankingPeriod;

  @IsOptional()
  @IsString()
  @IsIn(['FREE', 'PREMIUM', 'PRO'], {
    message: 'tier must be one of: FREE, PREMIUM, PRO'
  })
  tier?: 'FREE' | 'PREMIUM' | 'PRO';
}

/**
 * 分页查询基础 DTO
 */
export class PaginatedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit must not exceed 100' })
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'offset must be an integer' })
  @Min(0, { message: 'offset must be non-negative' })
  offset?: number = 0;
}

import { IsEnum, IsOptional, IsString } from 'class-validator';

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
  @IsEnum(RankingPeriod)
  period?: RankingPeriod;
}

export class LeaderboardQueryDto {
  @IsOptional()
  @IsEnum(RankingPeriod)
  period?: RankingPeriod;

  @IsOptional()
  @IsString()
  tier?: 'FREE' | 'PREMIUM' | 'PRO';
}

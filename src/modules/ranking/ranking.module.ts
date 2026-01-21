import { Module } from '@nestjs/common';
import { RankingController } from './ranking.controller';
import { RankingOptimizedService } from './ranking-optimized.service';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';

// Query Services
import { CuisineMastersQuery } from './queries/cuisine-masters.query';
import { LeaderboardQuery } from './queries/leaderboard.query';
import { GourmetsQuery } from './queries/gourmets.query';
import { DishExpertsQuery } from './queries/dish-experts.query';
import { UserDetailsQuery } from './queries/user-details.query';
import { StatsQuery } from './queries/stats.query';

// Cache Services
import { RankingCacheService } from './cache/ranking-cache.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [RankingController],
  providers: [
    // Main Service
    RankingOptimizedService,

    // Query Services
    CuisineMastersQuery,
    LeaderboardQuery,
    GourmetsQuery,
    DishExpertsQuery,
    UserDetailsQuery,
    StatsQuery,

    // Cache Services
    RankingCacheService,
  ],
  exports: [RankingOptimizedService],
})
export class RankingModule {}

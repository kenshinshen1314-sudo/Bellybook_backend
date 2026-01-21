import { Module } from '@nestjs/common';
import { RankingController } from './ranking.controller';
import { RankingOptimizedService } from './ranking-optimized.service';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [RankingController],
  providers: [RankingOptimizedService],
  exports: [RankingOptimizedService],
})
export class RankingModule {}

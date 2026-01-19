import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MealsModule } from './modules/meals/meals.module';
import { CuisinesModule } from './modules/cuisines/cuisines.module';
import { NutritionModule } from './modules/nutrition/nutrition.module';
import { SyncModule } from './modules/sync/sync.module';
import { StorageModule } from './modules/storage/storage.module';
import { RankingModule } from './modules/ranking/ranking.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { env } from './config/env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: env.RATE_LIMIT_TTL * 1000,
      limit: env.RATE_LIMIT_MAX,
    }]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    MealsModule,
    CuisinesModule,
    NutritionModule,
    SyncModule,
    StorageModule,
    RankingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

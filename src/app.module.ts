import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
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
import { CacheModuleClass } from './modules/cache/cache.module';
import { BullQueueModule } from './modules/queue/bull-queue.module';
import { MiddlewareModule } from './common/middleware/middleware.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
// import { UnifiedResponseInterceptor } from './common/interceptors/unified-response.interceptor';
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
    MiddlewareModule, // Request logging middleware
    CacheModuleClass, // Global cache module (Redis)
    BullQueueModule, // Async task queue (Bull + Redis)
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
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
    // Temporarily disabled - needs frontend changes to handle unified response format
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: UnifiedResponseInterceptor,
    // },
    Reflector, // Required for CacheInterceptor and UnifiedResponseInterceptor
  ],
})
export class AppModule {}

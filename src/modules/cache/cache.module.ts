/**
 * [INPUT]: 依赖 Redis 连接配置
 * [OUTPUT]: 对外提供缓存服务（支持 Redis 和内存回退）
 * [POS]: cache 模块的核心配置
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import { CacheService } from './cache.service';

// Re-export for convenience
export { CacheModule as NestJSCacheModule } from '@nestjs/cache-manager';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST');
        const redisPort = configService.get<number>('REDIS_PORT');
        const redisPassword = configService.get<string>('REDIS_PASSWORD');
        const redisDb = configService.get<number>('REDIS_DB');

        // Redis 配置
        const redisUrl = `redis://${redisPassword ? `:${redisPassword}@` : ''}${redisHost}:${redisPort}/${redisDb}`;

        return {
          store: await redisStore,
          url: redisUrl,
          ttl: 300, // 默认 5 分钟
          isGlobal: true,
        } as any;
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, NestCacheModule],
})
export class CacheModuleClass {}

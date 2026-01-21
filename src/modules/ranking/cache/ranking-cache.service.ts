/**
 * [INPUT]: 依赖 PrismaService 的 ranking_caches 表访问
 * [OUTPUT]: 对外提供缓存读写、TTL 管理
 * [POS]: ranking 模块的缓存服务层
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, RankingPeriod } from '@prisma/client';

const CACHE_TTL_MINUTES = 5;

@Injectable()
export class RankingCacheService {
  private readonly logger = new Logger(RankingCacheService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 从缓存获取数据
   */
  async get<T>(key: string): Promise<T | null> {
    const cache = await this.prisma.ranking_caches.findUnique({
      where: { id: key },
    });

    if (!cache) return null;

    // 检查是否过期
    if (cache.expiresAt < new Date()) {
      await this.delete(key);
      return null;
    }

    this.logger.debug(`Cache hit: ${key}`);
    return cache.rankings as unknown as T;
  }

  /**
   * 写入缓存
   */
  async set<T>(key: string, data: T, ttlMinutes: number = CACHE_TTL_MINUTES): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

    await this.prisma.ranking_caches.upsert({
      where: { id: key },
      create: {
        id: key,
        period: RankingPeriod.ALL_TIME,
        rankings: data as unknown as Prisma.InputJsonValue,
        expiresAt,
      },
      update: {
        rankings: data as unknown as Prisma.InputJsonValue,
        expiresAt,
        updatedAt: new Date(),
      },
    });

    this.logger.debug(`Cache set: ${key}, TTL: ${ttlMinutes}min`);
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    try {
      await this.prisma.ranking_caches.delete({ where: { id: key } });
      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      // 忽略不存在的缓存
      this.logger.debug(`Cache delete skipped (not found): ${key}`);
    }
  }

  /**
   * 清理过期缓存
   */
  async clearExpired(): Promise<void> {
    const result = await this.prisma.ranking_caches.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleared ${result.count} expired cache entries`);
    }
  }

  /**
   * 清空所有缓存
   */
  async clearAll(): Promise<void> {
    const result = await this.prisma.ranking_caches.deleteMany({});
    this.logger.log(`Cleared all cache entries: ${result.count}`);
  }
}

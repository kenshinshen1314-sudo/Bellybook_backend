import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';
import { CacheService } from './modules/cache/cache.service';
import { HealthCheckDto, ServiceStatus, SimpleHealthCheckDto } from './common/dto/health.dto';
import { env } from './config/env';

/**
 * [INPUT]: 依赖 PrismaService 和 CacheService
 * [OUTPUT]: 对外提供应用健康检查
 * [POS]: 应用的核心服务，被 app.controller 消费
 * [PROTOCOL]: 变更时更新此头部
 */
@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly startTime = Date.now();

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  /**
   * 简单健康检查（用于负载均衡器探针）
   * 只返回基本状态，不检查依赖服务
   */
  getSimpleHealth(): SimpleHealthCheckDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 详细健康检查（包含所有依赖服务状态）
   */
  async getHealth(): Promise<HealthCheckDto> {
    const services: ServiceStatus[] = [];
    let overallStatus: 'ok' | 'degraded' | 'down' = 'ok';

    // 检查数据库连接
    const dbStatus = await this.checkDatabase();
    services.push(dbStatus);
    if (dbStatus.status === 'down') {
      overallStatus = 'down';
    } else if (dbStatus.status === 'degraded' && overallStatus === 'ok') {
      overallStatus = 'degraded';
    }

    // 检查缓存连接
    const cacheStatus = await this.checkCache();
    services.push(cacheStatus);
    if (cacheStatus.status === 'down' && overallStatus !== 'down') {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      services,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      environment: env.NODE_ENV,
      version: process.env.APP_VERSION || '1.0.0',
    };
  }

  /**
   * 检查数据库连接状态
   */
  private async checkDatabase(): Promise<ServiceStatus> {
    const startTime = Date.now();

    try {
      const isHealthy = await this.prisma.healthCheck();
      const responseTime = Date.now() - startTime;

      // 获取连接池统计（仅在非生产环境暴露详细信息）
      const poolStats = env.NODE_ENV !== 'production'
        ? this.prisma.getConnectionStats()
        : undefined;

      return {
        name: 'database',
        status: isHealthy ? 'up' : 'down',
        responseTime,
        metadata: poolStats,
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        name: 'database',
        status: 'down',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 检查缓存连接状态
   */
  private async checkCache(): Promise<ServiceStatus> {
    const startTime = Date.now();

    try {
      // 使用 ping 命令检查 Redis 连接
      await this.cache.ping();
      const responseTime = Date.now() - startTime;

      return {
        name: 'cache',
        status: 'up',
        responseTime,
      };
    } catch (error) {
      this.logger.warn('Cache health check failed (optional service):', error);
      // 缓存失败不会导致应用不可用，只标记为 degraded
      return {
        name: 'cache',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 旧接口保持向后兼容
   */
  getHello(): string {
    return 'Bellybook API is running!';
  }
}

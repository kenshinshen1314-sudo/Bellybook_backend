import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

/**
 * 缓存元数据键
 */
export const CACHE_TTL_METADATA = 'cache_ttl';
export const NO_CACHE_METADATA = 'no_cache';

/**
 * 缓存配置选项
 */
interface CacheOptions {
  ttl?: number;           // Cache-Control max-age（秒）
  mustRevalidate?: boolean;  // 添加 must-revalidate 指令
  noCache?: boolean;      // 禁用缓存
  noStore?: boolean;      // 禁用存储
}

/**
 * HTTP 缓存拦截器
 *
 * 为响应添加 Cache-Control 头，减少客户端重复请求
 *
 * @example
 * ```typescript
 * // 在 controller 方法上使用
 * @Cache({ ttl: 300 })  // 缓存 5 分钟
 * findAll() { ... }
 *
 * @Cache({ ttl: 3600, mustRevalidate: true })  // 缓存 1 小时，需要重新验证
 * getConfig() { ... }
 *
 * @NoCache()  // 禁用缓存
 * getRealtimeData() { ... }
 * ```
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 检查是否有 NoCache 装饰器
    const noCache = this.reflector.getAllAndOverride<boolean>(
      NO_CACHE_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (noCache) {
      // 设置禁用缓存的头
      const response = context.switchToHttp().getResponse();
      response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Expires', '0');
      return next.handle();
    }

    // 获取缓存配置
    const cacheOptions = this.reflector.getAllAndOverride<CacheOptions>(
      CACHE_TTL_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (!cacheOptions || cacheOptions.noCache) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        const directives: string[] = [];

        if (cacheOptions.ttl !== undefined) {
          directives.push(`max-age=${cacheOptions.ttl}`);
        }

        if (cacheOptions.mustRevalidate) {
          directives.push('must-revalidate');
        }

        if (cacheOptions.noStore) {
          directives.push('no-store');
        }

        if (directives.length > 0) {
          response.setHeader('Cache-Control', directives.join(', '));
        }

        // 添加 ETag（可选，用于条件请求）
        if (data && typeof data === 'object') {
          const etag = this.generateETag(data);
          response.setHeader('ETag', etag);
        }

        return data;
      }),
    );
  }

  /**
   * 生成 ETag
   * 使用内容哈希作为 ETag 值
   */
  private generateETag(data: any): string {
    const str = JSON.stringify(data);
    // 简单哈希（生产环境建议使用 crypto.createHash）
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `"${hash.toString(16)}"`;
  }
}

/**
 * 缓存装饰器
 *
 * @param ttl 缓存时间（秒）
 * @param options 可选配置
 */
export function Cache(ttl: number, options?: Partial<CacheOptions>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    Reflect.defineMetadata(
      CACHE_TTL_METADATA,
      { ttl, ...options },
      descriptor.value,
    );
  };
}

/**
 * 禁用缓存装饰器
 */
export function NoCache() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    Reflect.defineMetadata(
      NO_CACHE_METADATA,
      true,
      descriptor.value,
    );
  };
}

/**
 * 常用缓存时间常量（秒）
 */
export const CacheTTL = {
  MINUTE: 60,
  FIVE_MINUTES: 300,
  FIFTEEN_MINUTES: 900,
  HALF_HOUR: 1800,
  HOUR: 3600,
  SIX_HOURS: 21600,
  DAY: 86400,
  WEEK: 604800,
} as const;

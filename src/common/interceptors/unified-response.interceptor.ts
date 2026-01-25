import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

/**
 * 统一响应装饰器标记
 */
export const SKIP_UNIFIED_RESPONSE = 'skip_unified_response';

/**
 * Global type extension for request context
 */
declare global {
  var __request: Request | undefined;
}

/**
 * 标准成功响应
 */
export interface ApiResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  code?: string;
  timestamp: string;
  path: string;
}

/**
 * 标准分页响应
 */
export interface PaginatedApiResponse<T = any> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  message?: string;
  code?: string;
  timestamp: string;
  path: string;
}

/**
 * 统一响应拦截器
 *
 * 自动将响应包装成统一格式：
 * - 成功响应: { success: true, data, ... }
 * - 错误响应: 由 AllExceptionsFilter 处理
 *
 * @example
 * ```typescript
 * // 原始返回
 * @Get()
 * findAll() { return this.service.findAll(); }
 * // 返回: [{ id: 1, name: 'Item' }]
 *
 * // 使用拦截器后
 * // 返回: { success: true, data: [{ id: 1, name: 'Item' }], timestamp: '...', path: '/api/v1/items' }
 * ```
 */
@Injectable()
export class UnifiedResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 检查是否跳过统一响应
    const skipUnifiedResponse = this.reflector.getAllAndOverride<boolean>(
      SKIP_UNIFIED_RESPONSE,
      [context.getHandler(), context.getClass()],
    );

    if (skipUnifiedResponse) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const path = request.url;
    const timestamp = new Date().toISOString();

    return next.handle().pipe(
      map((data) => {
        // 如果响应已经是统一格式，直接返回
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // 检查是否是分页响应
        if (this.isPaginatedResponse(data)) {
          return {
            success: true,
            data: data.data || [],
            pagination: {
              page: data.page || 1,
              limit: data.limit || 20,
              total: data.total || 0,
              hasMore: data.hasMore || false,
            },
            timestamp,
            path,
          };
        }

        // 标准响应
        return {
          success: true,
          data,
          timestamp,
          path,
        };
      }),
    );
  }

  /**
   * 检查是否是分页响应
   */
  private isPaginatedResponse(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      ('page' in data ||
        'limit' in data ||
        'total' in data ||
        'hasMore' in data ||
        'pagination' in data)
    );
  }
}

/**
 * 跳过统一响应装饰器
 * 用于某些需要自定义响应格式的端点
 *
 * @example
 * ```typescript
 * @SkipUnifiedResponse()
 * @Get('raw')
 * getRawData() {
 *   return { custom: 'format' };
 * }
 * // 返回: { custom: 'format' }  (不被包装)
 * ```
 */
export function SkipUnifiedResponse() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    Reflect.defineMetadata(
      SKIP_UNIFIED_RESPONSE,
      true,
      descriptor.value,
    );
  };
}

/**
 * 创建成功响应（手动构造）
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  code?: string,
): ApiResponse<T> {
  const request = globalThis.__request;
  return {
    success: true,
    data,
    ...(message && { message }),
    ...(code && { code }),
    timestamp: new Date().toISOString(),
    path: request?.url || '',
  };
}

/**
 * 创建分页响应（手动构造）
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  },
  message?: string,
  code?: string,
): PaginatedApiResponse<T> {
  const request = globalThis.__request;
  return {
    success: true,
    data,
    pagination,
    ...(message && { message }),
    ...(code && { code }),
    timestamp: new Date().toISOString(),
    path: request?.url || '',
  };
}

/**
 * [INPUT]: 依赖 NestJS 的 ExceptionFilter、HttpContext
 * [OUTPUT]: 对外提供统一的异常捕获和格式化响应
 * [POS]: common 模块的核心异常处理器，在 main.ts 全局注册
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * 统一错误响应格式
 */
interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  statusCode: number;
  timestamp: string;
  path: string;
}

/**
 * 全局异常过滤器
 *
 * 捕获所有异常，统一格式化后返回给客户端
 * 区分开发环境和生产环境的错误详情
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 提取错误信息
    const errorResponse = this.buildErrorResponse(exception, request);

    // 记录错误日志
    this.logError(exception, request);

    // 发送响应
    response.status(errorResponse.statusCode).json(errorResponse);
  }

  /**
   * 构建错误响应
   */
  private buildErrorResponse(exception: unknown, request: Request): ErrorResponse {
    const statusCode = this.extractStatusCode(exception);
    const message = this.extractMessage(exception);
    const error = this.extractErrorName(exception);

    return {
      success: false,
      error,
      message: this.isDevelopment() ? message : undefined,
      statusCode,
      timestamp: new Date().toISOString(),
      path: (request as any).url,
    };
  }

  /**
   * 提取状态码
   */
  private extractStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * 提取错误消息
   */
  private extractMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (typeof response === 'object' && response !== null) {
        return (response as any).message || (response as any).error || exception.message;
      }
    }
    if (exception instanceof Error) {
      return exception.message;
    }
    return 'An unexpected error occurred';
  }

  /**
   * 提取错误名称
   */
  private extractErrorName(exception: unknown): string {
    if (exception instanceof HttpException) {
      return exception.constructor.name;
    }
    if (exception instanceof Error) {
      return exception.constructor.name;
    }
    return 'UnknownError';
  }

  /**
   * 记录错误日志
   */
  private logError(exception: unknown, request: Request): void {
    const statusCode = this.extractStatusCode(exception);
    const message = this.extractMessage(exception);

    // 客户端错误（4xx）不记录详细堆栈
    if (statusCode >= 400 && statusCode < 500) {
      this.logger.warn(
        `${statusCode} ${(request as any).method} ${(request as any).url}: ${message}`
      );
      return;
    }

    // 服务器错误（5xx）记录详细堆栈
    const stack = exception instanceof Error ? exception.stack : undefined;
    this.logger.error(
      `${statusCode} ${(request as any).method} ${(request as any).url}: ${message}`,
      stack
    );
  }

  /**
   * 判断是否为开发环境
   */
  private isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }
}

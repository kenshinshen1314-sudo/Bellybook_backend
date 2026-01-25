/**
 * [INPUT]: 依赖 NestJS 的 ExceptionFilter、HttpContext
 * [OUTPUT]: 对外提供统一的异常捕获和格式化响应
 * [POS]: common 模块的核心异常处理器，在 main.ts 全局注册
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [UNIFIED RESPONSE FORMAT]
 * - 所有错误响应遵循统一格式
 * - 包含错误代码系统，便于前端国际化
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
 * 标准错误代码
 */
export enum ErrorCode {
  // 认证相关 (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',

  // 权限相关 (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // 资源相关 (404)
  NOT_FOUND = 'NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  MEAL_NOT_FOUND = 'MEAL_NOT_FOUND',
  DISH_NOT_FOUND = 'DISH_NOT_FOUND',

  // 请求相关 (400)
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',

  // 业务逻辑相关 (409)
  CONFLICT = 'CONFLICT',
  VERSION_CONFLICT = 'VERSION_CONFLICT',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // 服务器错误 (500)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

/**
 * 统一错误响应格式
 */
interface ErrorResponse {
  success: false;
  error: string;           // 错误类型/名称
  code: ErrorCode;         // 错误代码（用于前端国际化）
  message?: string;        // 用户友好的错误消息
  statusCode: number;      // HTTP 状态码
  timestamp: string;       // 时间戳
  path: string;            // 请求路径
  details?: any;           // 额外详情（仅开发环境）
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
    const code = this.mapToErrorCode(exception, statusCode);

    return {
      success: false,
      error,
      code,
      message: this.formatMessage(message, code),
      statusCode,
      timestamp: new Date().toISOString(),
      path: (request as any).url,
      ...(this.isDevelopment() && { details: this.extractDetails(exception) }),
    };
  }

  /**
   * 映射异常到错误代码
   */
  private mapToErrorCode(exception: unknown, statusCode: number): ErrorCode {
    if (exception instanceof HttpException) {
      const exceptionName = exception.constructor.name;

      // 根据异常类型映射错误代码
      switch (exceptionName) {
        case 'UnauthorizedException':
          return ErrorCode.UNAUTHORIZED;
        case 'ForbiddenException':
          return ErrorCode.FORBIDDEN;
        case 'NotFoundException':
          return ErrorCode.NOT_FOUND;
        case 'BadRequestException':
          return ErrorCode.BAD_REQUEST;
        case 'ConflictException':
          return ErrorCode.CONFLICT;
        default:
          // 根据 HTTP 状态码映射
          switch (statusCode) {
            case HttpStatus.UNAUTHORIZED:
              return ErrorCode.UNAUTHORIZED;
            case HttpStatus.FORBIDDEN:
              return ErrorCode.FORBIDDEN;
            case HttpStatus.NOT_FOUND:
              return ErrorCode.NOT_FOUND;
            case HttpStatus.BAD_REQUEST:
              return ErrorCode.BAD_REQUEST;
            case HttpStatus.CONFLICT:
              return ErrorCode.CONFLICT;
            default:
              return ErrorCode.INTERNAL_SERVER_ERROR;
          }
      }
    }

    return ErrorCode.INTERNAL_SERVER_ERROR;
  }

  /**
   * 格式化错误消息
   * 根据错误代码提供用户友好的消息
   */
  private formatMessage(message: string, code: ErrorCode): string {
    // 如果消息已经是用户友好的，直接返回
    if (message && !message.includes('0x') && !message.includes('null')) {
      return message;
    }

    // 根据错误代码返回默认消息
    const defaultMessages: Record<ErrorCode, string> = {
      [ErrorCode.UNAUTHORIZED]: '未授权，请先登录',
      [ErrorCode.TOKEN_EXPIRED]: '登录已过期，请重新登录',
      [ErrorCode.TOKEN_INVALID]: '登录信息无效',
      [ErrorCode.FORBIDDEN]: '没有权限执行此操作',
      [ErrorCode.INSUFFICIENT_PERMISSIONS]: '权限不足',
      [ErrorCode.NOT_FOUND]: '请求的资源不存在',
      [ErrorCode.USER_NOT_FOUND]: '用户不存在',
      [ErrorCode.MEAL_NOT_FOUND]: '餐食记录不存在',
      [ErrorCode.DISH_NOT_FOUND]: '菜品不存在',
      [ErrorCode.BAD_REQUEST]: '请求参数有误',
      [ErrorCode.VALIDATION_ERROR]: '数据验证失败',
      [ErrorCode.INVALID_INPUT]: '输入数据无效',
      [ErrorCode.DUPLICATE_ENTRY]: '数据已存在',
      [ErrorCode.CONFLICT]: '数据冲突，请重试',
      [ErrorCode.VERSION_CONFLICT]: '数据版本冲突',
      [ErrorCode.QUOTA_EXCEEDED]: '已达到配额限制',
      [ErrorCode.INTERNAL_SERVER_ERROR]: '服务器错误，请稍后重试',
      [ErrorCode.DATABASE_ERROR]: '数据库错误',
      [ErrorCode.EXTERNAL_SERVICE_ERROR]: '外部服务错误',
    };

    return defaultMessages[code] || '请求失败，请稍后重试';
  }

  /**
   * 提取错误详情（仅开发环境）
   */
  private extractDetails(exception: unknown): any {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        return response;
      }
    }
    if (exception instanceof Error) {
      return {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      };
    }
    return { exception };
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

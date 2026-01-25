/**
 * [REQUEST LOGGING MIDDLEWARE]
 * 请求日志中间件
 *
 * 功能：
 * - 记录所有 HTTP 请求的详细信息
 * - 计算响应时间
 * - 记录用户信息（如果已认证）
 * - 结构化日志输出
 * - 可配置跳过某些路径
 *
 * [PROTOCOL]
 * 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * 请求日志数据
 */
interface RequestLogData {
  requestId: string;
  method: string;
  path: string;
  query?: Record<string, any>;
  params?: Record<string, any>;
  ip: string;
  userAgent?: string;
  userId?: string;
  statusCode?: number;
  responseTime: number;
  timestamp: string;
}

/**
 * 可跳过的路径（健康检查等）
 */
const SKIP_PATHS = [
  '/health',
  '/hello',
  '/favicon.ico',
  '/robots.txt',
];

/**
 * 需要脱敏的请求头
 */
const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
];

/**
 * 请求日志中间件
 *
 * 为每个请求生成唯一 ID，记录完整请求/响应信息
 */
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    // 跳过特定路径
    if (this.shouldSkipPath(req.path)) {
      return next();
    }

    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // 添加 request ID 到请求对象
    (req as any).requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    // 记录请求开始
    this.logRequest(req, requestId);

    // 监听响应完成
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      this.logResponse(req, res, requestId, responseTime);
    });

    next();
  }

  /**
   * 记录请求信息
   */
  private logRequest(req: Request, requestId: string): void {
    const logData: Partial<RequestLogData> = {
      requestId,
      method: req.method,
      path: req.path,
      query: this.sanitizeQuery(req.query),
      params: req.params,
      ip: this.getClientIp(req),
      userAgent: this.getUserAgent(req),
      userId: this.getUserId(req),
      timestamp: new Date().toISOString(),
    };

    // 记录请求体（仅限非 GET 请求，且排除敏感路径）
    if (req.method !== 'GET' && !this.isSensitivePath(req.path)) {
      const body = this.sanitizeBody(req.body);
      if (body && Object.keys(body).length > 0) {
        (logData as any).body = body;
      }
    }

    this.logger.debug(
      `Incoming request: ${req.method} ${req.path}`,
      this.sanitizeLogData(logData),
    );
  }

  /**
   * 记录响应信息
   */
  private logResponse(req: Request, res: Response, requestId: string, responseTime: number): void {
    const statusCode = res.statusCode;
    const logLevel = this.getLogLevel(statusCode);

    const logData: RequestLogData = {
      requestId,
      method: req.method,
      path: req.path,
      query: this.sanitizeQuery(req.query),
      ip: this.getClientIp(req),
      userId: this.getUserId(req),
      statusCode,
      responseTime,
      timestamp: new Date().toISOString(),
    };

    const message = `${req.method} ${req.path} ${statusCode} - ${responseTime}ms`;

    if (logLevel === 'error') {
      this.logger.error(message, this.sanitizeLogData(logData));
    } else if (logLevel === 'warn') {
      this.logger.warn(message, this.sanitizeLogData(logData));
    } else {
      this.logger.log(logLevel, message, this.sanitizeLogData(logData));
    }
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId(): string {
    return uuidv4().substring(0, 8);
  }

  /**
   * 获取客户端 IP
   */
  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * 获取 User-Agent
   */
  private getUserAgent(req: Request): string | undefined {
    return req.headers['user-agent'] as string;
  }

  /**
   * 获取用户 ID（从 JWT）
   */
  private getUserId(req: Request): string | undefined {
    return (req as any).user?.userId;
  }

  /**
   * 清理查询参数（移除敏感信息）
   */
  private sanitizeQuery(query: any): Record<string, any> | undefined {
    if (!query || Object.keys(query).length === 0) {
      return undefined;
    }

    const sanitized = { ...query };
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'api_key'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * 清理请求体（移除敏感信息）
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'api_key', 'currentPassword', 'newPassword'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        // 递归清理嵌套对象
        sanitized[key] = this.sanitizeBody(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * 清理日志数据（移除敏感请求头）
   */
  private sanitizeLogData(data: any): any {
    if (!data) return data;

    const sanitized = { ...data };

    // 移除请求头中的敏感信息
    if ((sanitized as any).headers) {
      for (const key of SENSITIVE_HEADERS) {
        delete (sanitized as any).headers[key];
      }
    }

    return sanitized;
  }

  /**
   * 判断是否应该跳过此路径
   */
  private shouldSkipPath(path: string): boolean {
    return SKIP_PATHS.some(skipPath => path.startsWith(skipPath));
  }

  /**
   * 判断是否是敏感路径（如登录、注册）
   */
  private isSensitivePath(path: string): boolean {
    const sensitivePaths = ['/auth/login', '/auth/register', '/auth/refresh'];
    return sensitivePaths.some(sp => path.startsWith(sp));
  }

  /**
   * 根据状态码获取日志级别
   */
  private getLogLevel(statusCode: number): 'log' | 'warn' | 'error' {
    if (statusCode >= 500) {
      return 'error';
    } else if (statusCode >= 400) {
      return 'warn';
    }
    return 'log';
  }
}

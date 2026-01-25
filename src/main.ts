/**
 * [INPUT]: 依赖 AppModule 的应用根模块
 * [OUTPUT]: 启动 NestJS 应用，配置全局中间件和过滤器
 * [POS]: 应用的入口点，负责应用初始化
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [SECURITY HEADERS - Helmet]
 * - X-DNS-Prefetch-Control: 控制浏览器 DNS 预取
 * - X-Frame-Options: 防止点击劫持攻击
 * - X-Content-Type-Options: 防止 MIME 嗅探
 * - Referrer-Policy: 控制 Referer 信息泄露
 * - Content-Security-Policy: 防止 XSS、注入攻击
 * - Strict-Transport-Security: 强制 HTTPS 连接
 *
 * [GRACEFUL SHUTDOWN]
 * - SIGTERM: 容器/编排器发送的终止信号
 * - SIGINT: 用户中断信号（Ctrl+C）
 * - 等待现有请求完成（最多 10 秒）
 * - 关闭数据库连接
 * - 清理资源
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger, INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './database/prisma.service';
import { env } from './config/env';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { createSwaggerConfig, setupSwagger } from './config/swagger/swagger.config';
import helmet from 'helmet';
import compression from 'compression';
import { Request, Response } from 'express';

const GRACEFUL_SHUTDOWN_TIMEOUT = 10000; // 10 秒

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  const logger = new Logger('Bootstrap');

  // 获取 PrismaService 实例用于优雅关闭
  const prismaService = app.get(PrismaService);

  // Swagger API 文档（必须在 CORS 之前配置）
  const swaggerDocument = createSwaggerConfig();
  setupSwagger(app, swaggerDocument);

  // 安全响应头（Helmet）
  // 注意：需要在 CORS 之前配置
  app.use(
    helmet({
      // Content-Security-Policy: 控制资源加载来源
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // 允许内联样式（Swagger 需要）
          scriptSrc: ["'self'"], // 只允许同源脚本
          imgSrc: ["'self'", 'data:', 'https:'], // 允许图片（包括 data URI 和 HTTPS）
          connectSrc: ["'self'"], // 只允许同源连接
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
        },
      },
      // X-DNS-Prefetch-Control: 控制浏览器 DNS 预取（默认关闭）
      dnsPrefetchControl: {
        allow: false,
      },
      // X-Frame-Options: 防止点击劫持（默认 SAMEORIGIN）
      frameguard: {
        action: 'sameorigin',
      },
      // X-Content-Type-Options: 防止 MIME 嗅探（默认 nosniff）
      noSniff: true,
      // Referrer-Policy: 控制 Referer 头信息泄露
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
      // Strict-Transport-Security: 强制 HTTPS（仅生产环境）
      hsts: env.NODE_ENV === 'production' ? {
        maxAge: 31536000, // 1 年
        includeSubDomains: true,
        preload: true,
      } : false,
      // X-Powered-By: 隐藏 Express 框架信息
      hidePoweredBy: true,
      // 允许跨域请求（Swagger 需要）
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: false,
    }),
  );

  // 响应压缩（gzip）
  // 减少 60-80% 的传输数据量，提升响应速度
  app.use(
    compression({
      // 只压缩大于 1KB 的响应
      threshold: 1024,
      // 压缩级别 (1-9，越高压缩率越高但 CPU 消耗越大)
      level: 6,
      // 要压缩的 MIME 类型
      filter: (req: Request, res: Response) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        // 默认压缩 text、json、javascript 等类型
        return compression.filter(req, res);
      },
    }),
  );

  // 全局异常过滤器（必须在最前）
  app.useGlobalFilters(new AllExceptionsFilter());

  // API 版本控制
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // 全局路由前缀
  app.setGlobalPrefix('/api');

  // CORS 配置
  app.enableCors({
    origin: env.CORS_ORIGIN.split(','),
    credentials: true,
  });

  // 全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,               // 自动移除未在 DTO 中定义的属性
    forbidNonWhitelisted: true,    // 如果有未定义的属性则抛出错误
    transform: true,               // 自动转换类型（如字符串转数字）
    transformOptions: {
      enableImplicitConversion: true, // 启用隐式类型转换
    },
    stopAtFirstError: false,       // 返回所有验证错误，而不是在第一个错误时停止
    disableErrorMessages: false,   // 显示详细错误消息
  }));

  // 启动服务器
  await app.listen(env.PORT);
  logger.log(`🚀 Application is running on: http://localhost:${env.PORT}/api/v1`);
  logger.log(`📚 Environment: ${env.NODE_ENV}`);
  logger.log(`🔐 CORS origins: ${env.CORS_ORIGIN}`);
  logger.log(`🛡️  Security headers enabled via Helmet`);
  logger.log(`🗜️  Response compression enabled (gzip, threshold: 1KB, level: 6)`);

  // Swagger 文档地址
  if (env.SWAGGER_ENABLED) {
    logger.log(`📚 Swagger documentation: http://localhost:${env.PORT}/${env.SWAGGER_PATH}`);
  }

  // ============================================================
  // 优雅关闭处理
  // ============================================================
  const enableGracefulShutdown = async (app: INestApplication) => {
    const gracefulShutdown = (signal: string) => async () => {
      logger.log(`⚠️  Received ${signal}, starting graceful shutdown...`);

      // 设置超时，防止无限等待
      const timeout = setTimeout(() => {
        logger.error(`❌ Graceful shutdown timeout (${GRACEFUL_SHUTDOWN_TIMEOUT}ms), forcing exit`);
        process.exit(1);
      }, GRACEFUL_SHUTDOWN_TIMEOUT);

      try {
        // 停止接受新请求
        await app.close();
        logger.log('✅ HTTP server closed');

        // 关闭数据库连接
        await prismaService.onModuleDestroy();
        logger.log('✅ Database connections closed');

        clearTimeout(timeout);
        logger.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        clearTimeout(timeout);
        logger.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // 监听终止信号
    process.on('SIGTERM', gracefulShutdown('SIGTERM'));
    process.on('SIGINT', gracefulShutdown('SIGINT'));

    logger.log('🛡️  Graceful shutdown handlers registered (SIGTERM, SIGINT)');
  };

  await enableGracefulShutdown(app);
}

bootstrap();

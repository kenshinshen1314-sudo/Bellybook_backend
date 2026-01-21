/**
 * [INPUT]: 依赖 AppModule 的应用根模块
 * [OUTPUT]: 启动 NestJS 应用，配置全局中间件和过滤器
 * [POS]: 应用的入口点，负责应用初始化
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { env } from './config/env';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

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
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // 启动服务器
  await app.listen(env.PORT);
  logger.log(`🚀 Application is running on: http://localhost:${env.PORT}/api/v1`);
  logger.log(`📚 Environment: ${env.NODE_ENV}`);
  logger.log(`🔐 CORS origins: ${env.CORS_ORIGIN}`);
}

bootstrap();

/**
 * [MIDDLEWARE MODULE]
 * 中间件配置模块
 *
 * 注册所有应用中间件
 */
import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { LoggingMiddleware } from './logging.middleware';

/**
 * 中间件配置
 */
const MIDDLEWARE_CONFIG = {
  logging: {
    // 排除健康检查等路径
    exclude: [
      { path: '/health', method: RequestMethod.GET },
      { path: '/', method: RequestMethod.GET },
      { path: '/hello', method: RequestMethod.GET },
    ],
  },
};

@Module({})
export class MiddlewareModule {
  configure(consumer: MiddlewareConsumer) {
    // 注册请求日志中间件（应用于所有路由）
    consumer
      .apply(LoggingMiddleware)
      .exclude(
        ...MIDDLEWARE_CONFIG.logging.exclude,
      )
      .forRoutes('*');
  }
}

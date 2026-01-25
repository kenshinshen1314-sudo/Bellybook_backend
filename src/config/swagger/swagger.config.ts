/**
 * [INPUT]: 依赖环境配置和 NestJS 应用实例
 * [OUTPUT]: 对外提供 Swagger 配置选项
 * [POS]: Swagger API 文档配置
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { env } from '../env';
import type { OpenAPIObject } from '@nestjs/swagger';

/**
 * Swagger 配置选项
 */
export interface SwaggerConfigOptions {
  /**
   * 是否启用 Swagger
   */
  enabled?: boolean;

  /**
   * Swagger 文档路径
   */
  path?: string;

  /**
   * API 标题
   */
  title?: string;

  /**
   * API 描述
   */
  description?: string;

  /**
   * API 版本
   */
  version?: string;

  /**
   * API 标签列表
   */
  tags?: Array<{
    name: string;
    description: string;
  }>;

  /**
   * 服务器配置
   */
  servers?: Array<{
    url: string;
    description: string;
  }>;

  /**
   * 安全认证配置
   */
  security?: Array<{
    [key: string]: string[];
  }>;
}

/**
 * 默认 API 标签
 */
export const DEFAULT_API_TAGS = [
  {
    name: 'Auth',
    description: '认证相关接口（注册、登录、登出、刷新令牌）',
  },
  {
    name: 'Users',
    description: '用户管理接口（资料、设置、统计数据）',
  },
  {
    name: 'Meals',
    description: '餐食管理接口（CRUD、今日餐食、按日期查询）',
  },
  {
    name: 'Storage',
    description: '文件存储接口（图片上传、AI 分析）',
  },
  {
    name: 'Ranking',
    description: '排行榜接口（菜系专家榜、综合排行榜、美食家榜等）',
  },
  {
    name: 'Cuisines',
    description: '菜系管理接口（菜系列表、菜系详情）',
  },
  {
    name: 'Sync',
    description: '数据同步接口（拉取、推送、状态查询）',
  },
  {
    name: 'Nutrition',
    description: '营养分析接口（营养统计、健康建议）',
  },
];

/**
 * 创建 Swagger 文档配置
 */
export function createSwaggerConfig(options?: Partial<SwaggerConfigOptions>) {
  const config: Required<SwaggerConfigOptions> = {
    enabled: options?.enabled ?? env.SWAGGER_ENABLED,
    path: options?.path ?? env.SWAGGER_PATH,
    title: options?.title ?? env.SWAGGER_TITLE,
    description: options?.description ?? env.SWAGGER_DESCRIPTION,
    version: options?.version ?? env.SWAGGER_VERSION,
    tags: options?.tags ?? DEFAULT_API_TAGS,
    servers: options?.servers ?? [
      {
        url: env.API_PREFIX,
        description: `${env.NODE_ENV === 'production' ? '生产' : '开发'}环境`,
      },
    ],
    security: options?.security ?? [
      {
        bearer: [],
      },
    ],
  };

  return new DocumentBuilder()
    .setTitle(config.title)
    .setDescription(config.description)
    .setVersion(config.version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: '请输入 JWT token',
        in: 'header',
      },
      'bearer',
    )
    .addTag('Auth', config.tags[0].description)
    .addTag('Users', config.tags[1].description)
    .addTag('Meals', config.tags[2].description)
    .addTag('Storage', config.tags[3].description)
    .addTag('Ranking', config.tags[4].description)
    .addTag('Cuisines', config.tags[5].description)
    .addTag('Sync', config.tags[6].description)
    .addTag('Nutrition', config.tags[7].description)
    .build();
}

/**
 * 在应用中设置 Swagger
 */
export function setupSwagger(app: INestApplication, document: Omit<OpenAPIObject, 'paths'>): void {
  if (!env.SWAGGER_ENABLED) {
    return;
  }

  SwaggerModule.setup(env.SWAGGER_PATH, app, document as OpenAPIObject, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showRequestHeaders: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
    },
    customSiteTitle: 'Bellybook API Docs',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { font-size: 2em; font-weight: bold; }
      .swagger-ui .info .description { font-size: 1.1em; color: #666; }
      .swagger-ui .scheme-container { margin: 20px 0; }
      .swagger-ui .schemes-toogle { display: none; }
      .swagger-ui .info .link { display: none; }
    `,
  });

  const logger = new Logger('Swagger');
  logger.log(`📚 Swagger documentation available at: http://localhost:${env.PORT}/${env.SWAGGER_PATH}`);
}

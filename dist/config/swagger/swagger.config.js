"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_API_TAGS = void 0;
exports.createSwaggerConfig = createSwaggerConfig;
exports.setupSwagger = setupSwagger;
const swagger_1 = require("@nestjs/swagger");
const env_1 = require("../env");
exports.DEFAULT_API_TAGS = [
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
function createSwaggerConfig(options) {
    const config = {
        enabled: options?.enabled ?? env_1.env.SWAGGER_ENABLED,
        path: options?.path ?? env_1.env.SWAGGER_PATH,
        title: options?.title ?? env_1.env.SWAGGER_TITLE,
        description: options?.description ?? env_1.env.SWAGGER_DESCRIPTION,
        version: options?.version ?? env_1.env.SWAGGER_VERSION,
        tags: options?.tags ?? exports.DEFAULT_API_TAGS,
        servers: options?.servers ?? [
            {
                url: env_1.env.API_PREFIX,
                description: `${env_1.env.NODE_ENV === 'production' ? '生产' : '开发'}环境`,
            },
        ],
        security: options?.security ?? [
            {
                bearer: [],
            },
        ],
    };
    return new swagger_1.DocumentBuilder()
        .setTitle(config.title)
        .setDescription(config.description)
        .setVersion(config.version)
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: '请输入 JWT token',
        in: 'header',
    }, 'bearer')
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
function setupSwagger(app, document) {
    if (!env_1.env.SWAGGER_ENABLED) {
        return;
    }
    swagger_1.SwaggerModule.setup(env_1.env.SWAGGER_PATH, app, document, {
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
    console.log(`📚 Swagger documentation available at: http://localhost:${env_1.env.PORT}/${env_1.env.SWAGGER_PATH}`);
}
//# sourceMappingURL=swagger.config.js.map
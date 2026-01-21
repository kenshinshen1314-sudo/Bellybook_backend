"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const env_1 = require("./config/env");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const swagger_config_1 = require("./config/swagger/swagger.config");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const logger = new common_1.Logger('Bootstrap');
    const swaggerDocument = (0, swagger_config_1.createSwaggerConfig)();
    (0, swagger_config_1.setupSwagger)(app, swaggerDocument);
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter());
    app.enableVersioning({
        type: common_1.VersioningType.URI,
        defaultVersion: '1',
    });
    app.setGlobalPrefix('/api');
    app.enableCors({
        origin: env_1.env.CORS_ORIGIN.split(','),
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    await app.listen(env_1.env.PORT);
    logger.log(`🚀 Application is running on: http://localhost:${env_1.env.PORT}/api/v1`);
    logger.log(`📚 Environment: ${env_1.env.NODE_ENV}`);
    logger.log(`🔐 CORS origins: ${env_1.env.CORS_ORIGIN}`);
    if (env_1.env.SWAGGER_ENABLED) {
        logger.log(`📚 Swagger documentation: http://localhost:${env_1.env.PORT}/${env_1.env.SWAGGER_PATH}`);
    }
}
bootstrap();
//# sourceMappingURL=main.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const prisma_service_1 = require("./database/prisma.service");
const env_1 = require("./config/env");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const swagger_config_1 = require("./config/swagger/swagger.config");
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const GRACEFUL_SHUTDOWN_TIMEOUT = 10000;
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    const logger = new common_1.Logger('Bootstrap');
    const prismaService = app.get(prisma_service_1.PrismaService);
    const swaggerDocument = (0, swagger_config_1.createSwaggerConfig)();
    (0, swagger_config_1.setupSwagger)(app, swaggerDocument);
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
                upgradeInsecureRequests: env_1.env.NODE_ENV === 'production' ? [] : null,
            },
        },
        dnsPrefetchControl: {
            allow: false,
        },
        frameguard: {
            action: 'sameorigin',
        },
        noSniff: true,
        referrerPolicy: {
            policy: 'strict-origin-when-cross-origin',
        },
        hsts: env_1.env.NODE_ENV === 'production' ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        } : false,
        hidePoweredBy: true,
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        crossOriginOpenerPolicy: false,
    }));
    app.use((0, compression_1.default)({
        threshold: 1024,
        level: 6,
        filter: (req, res) => {
            if (req.headers['x-no-compression']) {
                return false;
            }
            return compression_1.default.filter(req, res);
        },
    }));
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
        stopAtFirstError: false,
        disableErrorMessages: false,
    }));
    await app.listen(env_1.env.PORT);
    logger.log(`🚀 Application is running on: http://localhost:${env_1.env.PORT}/api/v1`);
    logger.log(`📚 Environment: ${env_1.env.NODE_ENV}`);
    logger.log(`🔐 CORS origins: ${env_1.env.CORS_ORIGIN}`);
    logger.log(`🛡️  Security headers enabled via Helmet`);
    logger.log(`🗜️  Response compression enabled (gzip, threshold: 1KB, level: 6)`);
    if (env_1.env.SWAGGER_ENABLED) {
        logger.log(`📚 Swagger documentation: http://localhost:${env_1.env.PORT}/${env_1.env.SWAGGER_PATH}`);
    }
    const enableGracefulShutdown = async (app) => {
        const gracefulShutdown = (signal) => async () => {
            logger.log(`⚠️  Received ${signal}, starting graceful shutdown...`);
            const timeout = setTimeout(() => {
                logger.error(`❌ Graceful shutdown timeout (${GRACEFUL_SHUTDOWN_TIMEOUT}ms), forcing exit`);
                process.exit(1);
            }, GRACEFUL_SHUTDOWN_TIMEOUT);
            try {
                await app.close();
                logger.log('✅ HTTP server closed');
                await prismaService.onModuleDestroy();
                logger.log('✅ Database connections closed');
                clearTimeout(timeout);
                logger.log('✅ Graceful shutdown completed');
                process.exit(0);
            }
            catch (error) {
                clearTimeout(timeout);
                logger.error('❌ Error during graceful shutdown:', error);
                process.exit(1);
            }
        };
        process.on('SIGTERM', gracefulShutdown('SIGTERM'));
        process.on('SIGINT', gracefulShutdown('SIGINT'));
        logger.log('🛡️  Graceful shutdown handlers registered (SIGTERM, SIGINT)');
    };
    await enableGracefulShutdown(app);
}
bootstrap();
//# sourceMappingURL=main.js.map
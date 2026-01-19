"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const env_1 = require("./config/env");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
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
    console.log(`🚀 Application is running on: http://localhost:${env_1.env.PORT}/api/v1`);
}
bootstrap();
//# sourceMappingURL=main.js.map
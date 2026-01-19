import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import { env } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Set global prefix (without /v1, versioning will add it)
  app.setGlobalPrefix('/api');

  // Enable CORS
  app.enableCors({
    origin: env.CORS_ORIGIN.split(','),
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  await app.listen(env.PORT);
  console.log(`🚀 Application is running on: http://localhost:${env.PORT}/api/v1`);
}
bootstrap();

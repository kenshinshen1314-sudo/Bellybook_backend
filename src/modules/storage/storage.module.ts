import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { MealsModule } from '../meals/meals.module';
import { UsersModule } from '../users/users.module';
import { QueueModule } from '../queue/queue.module';
import { env } from '../../config/env';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    AiModule,
    MealsModule,
    UsersModule,
    QueueModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: env.MAX_FILE_SIZE,
      },
    }),
  ],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}

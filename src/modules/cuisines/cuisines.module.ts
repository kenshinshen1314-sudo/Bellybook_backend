import { Module } from '@nestjs/common';
import { CuisinesController } from './cuisines.controller';
import { CuisinesService } from './cuisines.service';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CuisinesController],
  providers: [CuisinesService],
  exports: [CuisinesService],
})
export class CuisinesModule {}

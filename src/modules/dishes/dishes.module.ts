import { Module } from '@nestjs/common';
import { DishesService } from './dishes.service';
import { DatabaseModule } from '../../database/database.module';
import { CacheModuleClass } from '../cache/cache.module';

@Module({
  imports: [DatabaseModule, CacheModuleClass],
  providers: [DishesService],
  exports: [DishesService],
})
export class DishesModule {}

import { Module } from '@nestjs/common';
import { DishesService } from './dishes.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [DishesService],
  exports: [DishesService],
})
export class DishesModule {}

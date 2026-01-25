import { Module } from '@nestjs/common';
import { MealsController } from './meals.controller';
import { MealsService } from './meals.service';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { DishesModule } from '../dishes/dishes.module';
import { CacheModuleClass } from '../cache/cache.module';
// import { IngredientsModule } from '../ingredients/ingredients.module'; // Temporarily disabled - tables don't exist

@Module({
  imports: [DatabaseModule, AuthModule, DishesModule, CacheModuleClass /*, IngredientsModule */],
  controllers: [MealsController],
  providers: [MealsService],
  exports: [MealsService],
})
export class MealsModule {}

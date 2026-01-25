"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const core_2 = require("@nestjs/core");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const database_module_1 = require("./database/database.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const meals_module_1 = require("./modules/meals/meals.module");
const cuisines_module_1 = require("./modules/cuisines/cuisines.module");
const nutrition_module_1 = require("./modules/nutrition/nutrition.module");
const sync_module_1 = require("./modules/sync/sync.module");
const storage_module_1 = require("./modules/storage/storage.module");
const ranking_module_1 = require("./modules/ranking/ranking.module");
const cache_module_1 = require("./modules/cache/cache.module");
const bull_queue_module_1 = require("./modules/queue/bull-queue.module");
const middleware_module_1 = require("./common/middleware/middleware.module");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const cache_interceptor_1 = require("./common/interceptors/cache.interceptor");
const env_1 = require("./config/env");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            throttler_1.ThrottlerModule.forRoot([{
                    ttl: env_1.env.RATE_LIMIT_TTL * 1000,
                    limit: env_1.env.RATE_LIMIT_MAX,
                }]),
            middleware_module_1.MiddlewareModule,
            cache_module_1.CacheModuleClass,
            bull_queue_module_1.BullQueueModule,
            database_module_1.DatabaseModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            meals_module_1.MealsModule,
            cuisines_module_1.CuisinesModule,
            nutrition_module_1.NutritionModule,
            sync_module_1.SyncModule,
            storage_module_1.StorageModule,
            ranking_module_1.RankingModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: cache_interceptor_1.CacheInterceptor,
            },
            core_2.Reflector,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
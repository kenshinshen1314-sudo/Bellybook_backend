"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RankingModule = void 0;
const common_1 = require("@nestjs/common");
const ranking_controller_1 = require("./ranking.controller");
const ranking_optimized_service_1 = require("./ranking-optimized.service");
const database_module_1 = require("../../database/database.module");
const auth_module_1 = require("../auth/auth.module");
const cache_module_1 = require("../cache/cache.module");
const cuisine_masters_query_1 = require("./queries/cuisine-masters.query");
const leaderboard_query_1 = require("./queries/leaderboard.query");
const gourmets_query_1 = require("./queries/gourmets.query");
const dish_experts_query_1 = require("./queries/dish-experts.query");
const user_details_query_1 = require("./queries/user-details.query");
const stats_query_1 = require("./queries/stats.query");
const ranking_cache_service_1 = require("./cache/ranking-cache.service");
let RankingModule = class RankingModule {
};
exports.RankingModule = RankingModule;
exports.RankingModule = RankingModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, auth_module_1.AuthModule, cache_module_1.CacheModuleClass],
        controllers: [ranking_controller_1.RankingController],
        providers: [
            ranking_optimized_service_1.RankingOptimizedService,
            cuisine_masters_query_1.CuisineMastersQuery,
            leaderboard_query_1.LeaderboardQuery,
            gourmets_query_1.GourmetsQuery,
            dish_experts_query_1.DishExpertsQuery,
            user_details_query_1.UserDetailsQuery,
            stats_query_1.StatsQuery,
            ranking_cache_service_1.RankingCacheService,
        ],
        exports: [ranking_optimized_service_1.RankingOptimizedService],
    })
], RankingModule);
//# sourceMappingURL=ranking.module.js.map
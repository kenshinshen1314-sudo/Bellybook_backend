"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NutritionModule = void 0;
const common_1 = require("@nestjs/common");
const nutrition_controller_1 = require("./nutrition.controller");
const nutrition_service_1 = require("./nutrition.service");
const database_module_1 = require("../../database/database.module");
const auth_module_1 = require("../auth/auth.module");
const cache_module_1 = require("../cache/cache.module");
let NutritionModule = class NutritionModule {
};
exports.NutritionModule = NutritionModule;
exports.NutritionModule = NutritionModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, auth_module_1.AuthModule, cache_module_1.CacheModuleClass],
        controllers: [nutrition_controller_1.NutritionController],
        providers: [nutrition_service_1.NutritionService],
        exports: [nutrition_service_1.NutritionService],
    })
], NutritionModule);
//# sourceMappingURL=nutrition.module.js.map
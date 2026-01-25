"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CuisinesModule = void 0;
const common_1 = require("@nestjs/common");
const cuisines_controller_1 = require("./cuisines.controller");
const cuisines_service_1 = require("./cuisines.service");
const database_module_1 = require("../../database/database.module");
const auth_module_1 = require("../auth/auth.module");
const cache_module_1 = require("../cache/cache.module");
let CuisinesModule = class CuisinesModule {
};
exports.CuisinesModule = CuisinesModule;
exports.CuisinesModule = CuisinesModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, auth_module_1.AuthModule, cache_module_1.CacheModuleClass],
        controllers: [cuisines_controller_1.CuisinesController],
        providers: [cuisines_service_1.CuisinesService],
        exports: [cuisines_service_1.CuisinesService],
    })
], CuisinesModule);
//# sourceMappingURL=cuisines.module.js.map
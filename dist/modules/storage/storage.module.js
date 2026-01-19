"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageModule = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const storage_controller_1 = require("./storage.controller");
const storage_service_1 = require("./storage.service");
const database_module_1 = require("../../database/database.module");
const auth_module_1 = require("../auth/auth.module");
const ai_module_1 = require("../ai/ai.module");
const meals_module_1 = require("../meals/meals.module");
const users_module_1 = require("../users/users.module");
const env_1 = require("../../config/env");
const multer_1 = require("multer");
let StorageModule = class StorageModule {
};
exports.StorageModule = StorageModule;
exports.StorageModule = StorageModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule,
            auth_module_1.AuthModule,
            ai_module_1.AiModule,
            meals_module_1.MealsModule,
            users_module_1.UsersModule,
            platform_express_1.MulterModule.register({
                storage: (0, multer_1.memoryStorage)(),
                limits: {
                    fileSize: env_1.env.MAX_FILE_SIZE,
                },
            }),
        ],
        controllers: [storage_controller_1.StorageController],
        providers: [storage_service_1.StorageService],
        exports: [storage_service_1.StorageService],
    })
], StorageModule);
//# sourceMappingURL=storage.module.js.map
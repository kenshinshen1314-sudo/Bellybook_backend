"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueModule = void 0;
const common_1 = require("@nestjs/common");
const ai_queue_service_1 = require("./ai-queue.service");
const ai_module_1 = require("../ai/ai.module");
const meals_module_1 = require("../meals/meals.module");
const database_module_1 = require("../../database/database.module");
let QueueModule = class QueueModule {
};
exports.QueueModule = QueueModule;
exports.QueueModule = QueueModule = __decorate([
    (0, common_1.Module)({
        imports: [ai_module_1.AiModule, meals_module_1.MealsModule, database_module_1.DatabaseModule],
        providers: [ai_queue_service_1.AiQueueService],
        exports: [ai_queue_service_1.AiQueueService],
    })
], QueueModule);
//# sourceMappingURL=queue.module.js.map
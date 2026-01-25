"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BullQueueModule = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
const bull_queue_service_1 = require("./bull-queue.service");
const bull_queue_processor_1 = require("./bull-queue.processor");
const queue_controller_1 = require("./queue.controller");
const cache_module_1 = require("../cache/cache.module");
const database_module_1 = require("../../database/database.module");
const ai_module_1 = require("../ai/ai.module");
const meals_module_1 = require("../meals/meals.module");
const auth_module_1 = require("../auth/auth.module");
const queue_constants_1 = require("./queue.constants");
let BullQueueModule = class BullQueueModule {
};
exports.BullQueueModule = BullQueueModule;
exports.BullQueueModule = BullQueueModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            bull_1.BullModule.registerQueue({
                name: queue_constants_1.QUEUE_NAMES.AI_ANALYSIS,
                ...queue_constants_1.QUEUE_CONFIGS[queue_constants_1.QUEUE_NAMES.AI_ANALYSIS],
            }, {
                name: queue_constants_1.QUEUE_NAMES.EMAIL,
                ...queue_constants_1.QUEUE_CONFIGS[queue_constants_1.QUEUE_NAMES.EMAIL],
            }, {
                name: queue_constants_1.QUEUE_NAMES.NOTIFICATION,
                ...queue_constants_1.QUEUE_CONFIGS[queue_constants_1.QUEUE_NAMES.NOTIFICATION],
            }, {
                name: queue_constants_1.QUEUE_NAMES.SYNC,
                ...queue_constants_1.QUEUE_CONFIGS[queue_constants_1.QUEUE_NAMES.SYNC],
            }, {
                name: queue_constants_1.QUEUE_NAMES.WEBHOOK,
                ...queue_constants_1.QUEUE_CONFIGS[queue_constants_1.QUEUE_NAMES.WEBHOOK],
            }, {
                name: queue_constants_1.QUEUE_NAMES.CLEANUP,
                ...queue_constants_1.QUEUE_CONFIGS[queue_constants_1.QUEUE_NAMES.CLEANUP],
            }),
            database_module_1.DatabaseModule,
            cache_module_1.CacheModuleClass,
            auth_module_1.AuthModule,
            ai_module_1.AiModule,
            meals_module_1.MealsModule,
        ],
        controllers: [queue_controller_1.QueueController],
        providers: [
            bull_queue_service_1.QueueService,
            bull_queue_processor_1.AiAnalysisProcessor,
            bull_queue_processor_1.EmailProcessor,
            bull_queue_processor_1.NotificationProcessor,
            bull_queue_processor_1.SyncProcessor,
            bull_queue_processor_1.WebhookProcessor,
            bull_queue_processor_1.CleanupProcessor,
        ],
        exports: [bull_queue_service_1.QueueService],
    })
], BullQueueModule);
//# sourceMappingURL=bull-queue.module.js.map
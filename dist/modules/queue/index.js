"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUEUE_CONFIGS = exports.QUEUE_NAMES = exports.QueueService = exports.BullQueueModule = exports.QueueModule = void 0;
var queue_module_1 = require("./queue.module");
Object.defineProperty(exports, "QueueModule", { enumerable: true, get: function () { return queue_module_1.QueueModule; } });
var bull_queue_module_1 = require("./bull-queue.module");
Object.defineProperty(exports, "BullQueueModule", { enumerable: true, get: function () { return bull_queue_module_1.BullQueueModule; } });
var bull_queue_service_1 = require("./bull-queue.service");
Object.defineProperty(exports, "QueueService", { enumerable: true, get: function () { return bull_queue_service_1.QueueService; } });
var queue_constants_1 = require("./queue.constants");
Object.defineProperty(exports, "QUEUE_NAMES", { enumerable: true, get: function () { return queue_constants_1.QUEUE_NAMES; } });
Object.defineProperty(exports, "QUEUE_CONFIGS", { enumerable: true, get: function () { return queue_constants_1.QUEUE_CONFIGS; } });
//# sourceMappingURL=index.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiddlewareModule = void 0;
const common_1 = require("@nestjs/common");
const logging_middleware_1 = require("./logging.middleware");
const MIDDLEWARE_CONFIG = {
    logging: {
        exclude: [
            { path: '/health', method: common_1.RequestMethod.GET },
            { path: '/', method: common_1.RequestMethod.GET },
            { path: '/hello', method: common_1.RequestMethod.GET },
        ],
    },
};
let MiddlewareModule = class MiddlewareModule {
    configure(consumer) {
        consumer
            .apply(logging_middleware_1.LoggingMiddleware)
            .exclude(...MIDDLEWARE_CONFIG.logging.exclude)
            .forRoutes('*');
    }
};
exports.MiddlewareModule = MiddlewareModule;
exports.MiddlewareModule = MiddlewareModule = __decorate([
    (0, common_1.Module)({})
], MiddlewareModule);
//# sourceMappingURL=middleware.module.js.map
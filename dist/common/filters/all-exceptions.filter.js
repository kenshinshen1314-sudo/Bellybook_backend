"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    logger = new common_1.Logger(AllExceptionsFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const errorResponse = this.buildErrorResponse(exception, request);
        this.logError(exception, request);
        response.status(errorResponse.statusCode).json(errorResponse);
    }
    buildErrorResponse(exception, request) {
        const statusCode = this.extractStatusCode(exception);
        const message = this.extractMessage(exception);
        const error = this.extractErrorName(exception);
        return {
            success: false,
            error,
            message: this.isDevelopment() ? message : undefined,
            statusCode,
            timestamp: new Date().toISOString(),
            path: request.url,
        };
    }
    extractStatusCode(exception) {
        if (exception instanceof common_1.HttpException) {
            return exception.getStatus();
        }
        return common_1.HttpStatus.INTERNAL_SERVER_ERROR;
    }
    extractMessage(exception) {
        if (exception instanceof common_1.HttpException) {
            const response = exception.getResponse();
            if (typeof response === 'string') {
                return response;
            }
            if (typeof response === 'object' && response !== null) {
                return response.message || response.error || exception.message;
            }
        }
        if (exception instanceof Error) {
            return exception.message;
        }
        return 'An unexpected error occurred';
    }
    extractErrorName(exception) {
        if (exception instanceof common_1.HttpException) {
            return exception.constructor.name;
        }
        if (exception instanceof Error) {
            return exception.constructor.name;
        }
        return 'UnknownError';
    }
    logError(exception, request) {
        const statusCode = this.extractStatusCode(exception);
        const message = this.extractMessage(exception);
        if (statusCode >= 400 && statusCode < 500) {
            this.logger.warn(`${statusCode} ${request.method} ${request.url}: ${message}`);
            return;
        }
        const stack = exception instanceof Error ? exception.stack : undefined;
        this.logger.error(`${statusCode} ${request.method} ${request.url}: ${message}`, stack);
    }
    isDevelopment() {
        return process.env.NODE_ENV === 'development';
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map
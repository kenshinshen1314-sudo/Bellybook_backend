"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = exports.ErrorCode = void 0;
const common_1 = require("@nestjs/common");
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    ErrorCode["TOKEN_INVALID"] = "TOKEN_INVALID";
    ErrorCode["FORBIDDEN"] = "FORBIDDEN";
    ErrorCode["INSUFFICIENT_PERMISSIONS"] = "INSUFFICIENT_PERMISSIONS";
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ErrorCode["USER_NOT_FOUND"] = "USER_NOT_FOUND";
    ErrorCode["MEAL_NOT_FOUND"] = "MEAL_NOT_FOUND";
    ErrorCode["DISH_NOT_FOUND"] = "DISH_NOT_FOUND";
    ErrorCode["BAD_REQUEST"] = "BAD_REQUEST";
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
    ErrorCode["DUPLICATE_ENTRY"] = "DUPLICATE_ENTRY";
    ErrorCode["CONFLICT"] = "CONFLICT";
    ErrorCode["VERSION_CONFLICT"] = "VERSION_CONFLICT";
    ErrorCode["QUOTA_EXCEEDED"] = "QUOTA_EXCEEDED";
    ErrorCode["INTERNAL_SERVER_ERROR"] = "INTERNAL_SERVER_ERROR";
    ErrorCode["DATABASE_ERROR"] = "DATABASE_ERROR";
    ErrorCode["EXTERNAL_SERVICE_ERROR"] = "EXTERNAL_SERVICE_ERROR";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
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
        const code = this.mapToErrorCode(exception, statusCode);
        return {
            success: false,
            error,
            code,
            message: this.formatMessage(message, code),
            statusCode,
            timestamp: new Date().toISOString(),
            path: request.url,
            ...(this.isDevelopment() && { details: this.extractDetails(exception) }),
        };
    }
    mapToErrorCode(exception, statusCode) {
        if (exception instanceof common_1.HttpException) {
            const exceptionName = exception.constructor.name;
            switch (exceptionName) {
                case 'UnauthorizedException':
                    return ErrorCode.UNAUTHORIZED;
                case 'ForbiddenException':
                    return ErrorCode.FORBIDDEN;
                case 'NotFoundException':
                    return ErrorCode.NOT_FOUND;
                case 'BadRequestException':
                    return ErrorCode.BAD_REQUEST;
                case 'ConflictException':
                    return ErrorCode.CONFLICT;
                default:
                    switch (statusCode) {
                        case common_1.HttpStatus.UNAUTHORIZED:
                            return ErrorCode.UNAUTHORIZED;
                        case common_1.HttpStatus.FORBIDDEN:
                            return ErrorCode.FORBIDDEN;
                        case common_1.HttpStatus.NOT_FOUND:
                            return ErrorCode.NOT_FOUND;
                        case common_1.HttpStatus.BAD_REQUEST:
                            return ErrorCode.BAD_REQUEST;
                        case common_1.HttpStatus.CONFLICT:
                            return ErrorCode.CONFLICT;
                        default:
                            return ErrorCode.INTERNAL_SERVER_ERROR;
                    }
            }
        }
        return ErrorCode.INTERNAL_SERVER_ERROR;
    }
    formatMessage(message, code) {
        if (message && !message.includes('0x') && !message.includes('null')) {
            return message;
        }
        const defaultMessages = {
            [ErrorCode.UNAUTHORIZED]: '未授权，请先登录',
            [ErrorCode.TOKEN_EXPIRED]: '登录已过期，请重新登录',
            [ErrorCode.TOKEN_INVALID]: '登录信息无效',
            [ErrorCode.FORBIDDEN]: '没有权限执行此操作',
            [ErrorCode.INSUFFICIENT_PERMISSIONS]: '权限不足',
            [ErrorCode.NOT_FOUND]: '请求的资源不存在',
            [ErrorCode.USER_NOT_FOUND]: '用户不存在',
            [ErrorCode.MEAL_NOT_FOUND]: '餐食记录不存在',
            [ErrorCode.DISH_NOT_FOUND]: '菜品不存在',
            [ErrorCode.BAD_REQUEST]: '请求参数有误',
            [ErrorCode.VALIDATION_ERROR]: '数据验证失败',
            [ErrorCode.INVALID_INPUT]: '输入数据无效',
            [ErrorCode.DUPLICATE_ENTRY]: '数据已存在',
            [ErrorCode.CONFLICT]: '数据冲突，请重试',
            [ErrorCode.VERSION_CONFLICT]: '数据版本冲突',
            [ErrorCode.QUOTA_EXCEEDED]: '已达到配额限制',
            [ErrorCode.INTERNAL_SERVER_ERROR]: '服务器错误，请稍后重试',
            [ErrorCode.DATABASE_ERROR]: '数据库错误',
            [ErrorCode.EXTERNAL_SERVICE_ERROR]: '外部服务错误',
        };
        return defaultMessages[code] || '请求失败，请稍后重试';
    }
    extractDetails(exception) {
        if (exception instanceof common_1.HttpException) {
            const response = exception.getResponse();
            if (typeof response === 'object' && response !== null) {
                return response;
            }
        }
        if (exception instanceof Error) {
            return {
                name: exception.name,
                message: exception.message,
                stack: exception.stack,
            };
        }
        return { exception };
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
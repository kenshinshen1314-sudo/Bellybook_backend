import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
export declare enum ErrorCode {
    UNAUTHORIZED = "UNAUTHORIZED",
    TOKEN_EXPIRED = "TOKEN_EXPIRED",
    TOKEN_INVALID = "TOKEN_INVALID",
    FORBIDDEN = "FORBIDDEN",
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
    NOT_FOUND = "NOT_FOUND",
    USER_NOT_FOUND = "USER_NOT_FOUND",
    MEAL_NOT_FOUND = "MEAL_NOT_FOUND",
    DISH_NOT_FOUND = "DISH_NOT_FOUND",
    BAD_REQUEST = "BAD_REQUEST",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    INVALID_INPUT = "INVALID_INPUT",
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY",
    CONFLICT = "CONFLICT",
    VERSION_CONFLICT = "VERSION_CONFLICT",
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
    DATABASE_ERROR = "DATABASE_ERROR",
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
}
export declare class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: unknown, host: ArgumentsHost): void;
    private buildErrorResponse;
    private mapToErrorCode;
    private formatMessage;
    private extractDetails;
    private extractStatusCode;
    private extractMessage;
    private extractErrorName;
    private logError;
    private isDevelopment;
}

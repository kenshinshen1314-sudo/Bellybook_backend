"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingMiddleware = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const SKIP_PATHS = [
    '/health',
    '/hello',
    '/favicon.ico',
    '/robots.txt',
];
const SENSITIVE_HEADERS = [
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
];
let LoggingMiddleware = class LoggingMiddleware {
    logger = new common_1.Logger('HTTP');
    use(req, res, next) {
        if (this.shouldSkipPath(req.path)) {
            return next();
        }
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        req.requestId = requestId;
        res.setHeader('X-Request-ID', requestId);
        this.logRequest(req, requestId);
        res.on('finish', () => {
            const responseTime = Date.now() - startTime;
            this.logResponse(req, res, requestId, responseTime);
        });
        next();
    }
    logRequest(req, requestId) {
        const logData = {
            requestId,
            method: req.method,
            path: req.path,
            query: this.sanitizeQuery(req.query),
            params: req.params,
            ip: this.getClientIp(req),
            userAgent: this.getUserAgent(req),
            userId: this.getUserId(req),
            timestamp: new Date().toISOString(),
        };
        if (req.method !== 'GET' && !this.isSensitivePath(req.path)) {
            const body = this.sanitizeBody(req.body);
            if (body && Object.keys(body).length > 0) {
                logData.body = body;
            }
        }
        this.logger.debug(`Incoming request: ${req.method} ${req.path}`, this.sanitizeLogData(logData));
    }
    logResponse(req, res, requestId, responseTime) {
        const statusCode = res.statusCode;
        const logLevel = this.getLogLevel(statusCode);
        const logData = {
            requestId,
            method: req.method,
            path: req.path,
            query: this.sanitizeQuery(req.query),
            ip: this.getClientIp(req),
            userId: this.getUserId(req),
            statusCode,
            responseTime,
            timestamp: new Date().toISOString(),
        };
        const message = `${req.method} ${req.path} ${statusCode} - ${responseTime}ms`;
        if (logLevel === 'error') {
            this.logger.error(message, this.sanitizeLogData(logData));
        }
        else if (logLevel === 'warn') {
            this.logger.warn(message, this.sanitizeLogData(logData));
        }
        else {
            this.logger.log(logLevel, message, this.sanitizeLogData(logData));
        }
    }
    generateRequestId() {
        return (0, uuid_1.v4)().substring(0, 8);
    }
    getClientIp(req) {
        return (req.headers['x-forwarded-for']?.split(',')[0].trim() ||
            req.headers['x-real-ip'] ||
            req.socket.remoteAddress ||
            'unknown');
    }
    getUserAgent(req) {
        return req.headers['user-agent'];
    }
    getUserId(req) {
        return req.user?.userId;
    }
    sanitizeQuery(query) {
        if (!query || Object.keys(query).length === 0) {
            return undefined;
        }
        const sanitized = { ...query };
        const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'api_key'];
        for (const key of Object.keys(sanitized)) {
            if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
                sanitized[key] = '[REDACTED]';
            }
        }
        return sanitized;
    }
    sanitizeBody(body) {
        if (!body || typeof body !== 'object') {
            return body;
        }
        const sanitized = { ...body };
        const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'api_key', 'currentPassword', 'newPassword'];
        for (const key of Object.keys(sanitized)) {
            if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
                sanitized[key] = '[REDACTED]';
            }
            else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                sanitized[key] = this.sanitizeBody(sanitized[key]);
            }
        }
        return sanitized;
    }
    sanitizeLogData(data) {
        if (!data)
            return data;
        const sanitized = { ...data };
        if (sanitized.headers) {
            for (const key of SENSITIVE_HEADERS) {
                delete sanitized.headers[key];
            }
        }
        return sanitized;
    }
    shouldSkipPath(path) {
        return SKIP_PATHS.some(skipPath => path.startsWith(skipPath));
    }
    isSensitivePath(path) {
        const sensitivePaths = ['/auth/login', '/auth/register', '/auth/refresh'];
        return sensitivePaths.some(sp => path.startsWith(sp));
    }
    getLogLevel(statusCode) {
        if (statusCode >= 500) {
            return 'error';
        }
        else if (statusCode >= 400) {
            return 'warn';
        }
        return 'log';
    }
};
exports.LoggingMiddleware = LoggingMiddleware;
exports.LoggingMiddleware = LoggingMiddleware = __decorate([
    (0, common_1.Injectable)()
], LoggingMiddleware);
//# sourceMappingURL=logging.middleware.js.map
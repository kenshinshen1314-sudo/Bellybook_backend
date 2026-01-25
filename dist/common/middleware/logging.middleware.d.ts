import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
export declare class LoggingMiddleware implements NestMiddleware {
    private readonly logger;
    use(req: Request, res: Response, next: NextFunction): void;
    private logRequest;
    private logResponse;
    private generateRequestId;
    private getClientIp;
    private getUserAgent;
    private getUserId;
    private sanitizeQuery;
    private sanitizeBody;
    private sanitizeLogData;
    private shouldSkipPath;
    private isSensitivePath;
    private getLogLevel;
}

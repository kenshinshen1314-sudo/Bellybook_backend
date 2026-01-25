import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
export declare const SKIP_UNIFIED_RESPONSE = "skip_unified_response";
declare global {
    var __request: Request | undefined;
}
export interface ApiResponse<T = any> {
    success: true;
    data: T;
    message?: string;
    code?: string;
    timestamp: string;
    path: string;
}
export interface PaginatedApiResponse<T = any> {
    success: true;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
    };
    message?: string;
    code?: string;
    timestamp: string;
    path: string;
}
export declare class UnifiedResponseInterceptor implements NestInterceptor {
    private readonly reflector;
    constructor(reflector: Reflector);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private isPaginatedResponse;
}
export declare function SkipUnifiedResponse(): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare function createSuccessResponse<T>(data: T, message?: string, code?: string): ApiResponse<T>;
export declare function createPaginatedResponse<T>(data: T[], pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
}, message?: string, code?: string): PaginatedApiResponse<T>;

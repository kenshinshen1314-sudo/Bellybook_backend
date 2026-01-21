export declare class ApiResponseDto<T> {
    success: boolean;
    data?: T;
    message?: string;
    code?: string;
}
export declare class PaginationMetaDto {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
}
export declare class PaginatedResponseDto<T> {
    data: T[];
    meta: PaginationMetaDto;
}
export declare class ErrorResponseDto {
    statusCode: number;
    message: string;
    code?: string;
    errors?: string[];
    timestamp: string;
    path: string;
}

import { z } from 'zod';
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    offset: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type PaginationDto = z.infer<typeof paginationSchema>;
export declare class PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    constructor(data: T[], total: number, page: number, limit: number);
}

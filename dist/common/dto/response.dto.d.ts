import { z } from 'zod';
export declare const responseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodOptional<z.ZodString>;
    data: z.ZodOptional<z.ZodAny>;
    error: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ResponseDto = z.infer<typeof responseSchema>;
export declare class SuccessResponse<T = any> {
    success: true;
    data?: T;
    message?: string;
    constructor(data?: T, message?: string);
}
export declare class ErrorResponse {
    success: false;
    error: string;
    message?: string;
    constructor(error: string, message?: string);
}

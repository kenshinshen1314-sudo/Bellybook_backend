import { z } from 'zod';

export const responseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
  error: z.string().optional(),
});

export type ResponseDto = z.infer<typeof responseSchema>;

export class SuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;

  constructor(data?: T, message?: string) {
    this.success = true;
    this.data = data;
    this.message = message;
  }
}

export class ErrorResponse {
  success: false;
  error: string;
  message?: string;

  constructor(error: string, message?: string) {
    this.success = false;
    this.error = error;
    this.message = message;
  }
}

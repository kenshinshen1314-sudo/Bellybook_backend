import { INestApplication } from '@nestjs/common';
export interface SwaggerConfigOptions {
    enabled?: boolean;
    path?: string;
    title?: string;
    description?: string;
    version?: string;
    tags?: Array<{
        name: string;
        description: string;
    }>;
    servers?: Array<{
        url: string;
        description: string;
    }>;
    security?: Array<{
        [key: string]: string[];
    }>;
}
export declare const DEFAULT_API_TAGS: {
    name: string;
    description: string;
}[];
export declare function createSwaggerConfig(options?: Partial<SwaggerConfigOptions>): Omit<import("@nestjs/swagger").OpenAPIObject, "paths">;
export declare function setupSwagger(app: INestApplication, document: any): void;

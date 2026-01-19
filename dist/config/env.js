"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = exports.validateEnv = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string().url(),
    DIRECT_URL: zod_1.z.string().url(),
    SUPABASE_URL: zod_1.z.string().url(),
    SUPABASE_ANON_KEY: zod_1.z.string(),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string(),
    SUPABASE_STORAGE_BUCKET: zod_1.z.string().default('meal-images'),
    JWT_SECRET: zod_1.z.string().min(32),
    JWT_EXPIRES_IN: zod_1.z.string().default('15m'),
    REFRESH_TOKEN_EXPIRES_IN: zod_1.z.string().default('7d'),
    GEMINI_API_KEY: zod_1.z.string().optional(),
    GEMINI_MODEL: zod_1.z.string().default('gemini-2.5-flash-preview'),
    HTTPS_PROXY: zod_1.z.string().optional(),
    REDIS_HOST: zod_1.z.string().default('localhost'),
    REDIS_PORT: zod_1.z.coerce.number().default(6379),
    REDIS_PASSWORD: zod_1.z.string().default(''),
    REDIS_DB: zod_1.z.coerce.number().default(0),
    PORT: zod_1.z.coerce.number().default(3000),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    API_PREFIX: zod_1.z.string().default('/api/v1'),
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:5173'),
    MAX_FILE_SIZE: zod_1.z.coerce.number().default(5242880),
    ALLOWED_IMAGE_TYPES: zod_1.z.string().default('image/jpeg,image/png,image/webp'),
    RATE_LIMIT_TTL: zod_1.z.coerce.number().default(60),
    RATE_LIMIT_MAX: zod_1.z.coerce.number().default(100),
    LOG_LEVEL: zod_1.z.enum(['debug', 'info', 'warn', 'error']).default('debug'),
    LOG_FORMAT: zod_1.z.enum(['json', 'pretty']).default('pretty'),
});
const validateEnv = () => {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        console.error('❌ Invalid environment variables:');
        console.error(parsed.error.flatten().fieldErrors);
        throw new Error('Environment validation failed');
    }
    return parsed.data;
};
exports.validateEnv = validateEnv;
exports.env = (0, exports.validateEnv)();
//# sourceMappingURL=env.js.map
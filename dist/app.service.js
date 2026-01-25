"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AppService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./database/prisma.service");
const cache_service_1 = require("./modules/cache/cache.service");
const env_1 = require("./config/env");
let AppService = AppService_1 = class AppService {
    prisma;
    cache;
    logger = new common_1.Logger(AppService_1.name);
    startTime = Date.now();
    constructor(prisma, cache) {
        this.prisma = prisma;
        this.cache = cache;
    }
    getSimpleHealth() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    }
    async getHealth() {
        const services = [];
        let overallStatus = 'ok';
        const dbStatus = await this.checkDatabase();
        services.push(dbStatus);
        if (dbStatus.status === 'down') {
            overallStatus = 'down';
        }
        else if (dbStatus.status === 'degraded' && overallStatus === 'ok') {
            overallStatus = 'degraded';
        }
        const cacheStatus = await this.checkCache();
        services.push(cacheStatus);
        if (cacheStatus.status === 'down' && overallStatus !== 'down') {
            overallStatus = 'degraded';
        }
        return {
            status: overallStatus,
            services,
            timestamp: new Date().toISOString(),
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            environment: env_1.env.NODE_ENV,
            version: process.env.APP_VERSION || '1.0.0',
        };
    }
    async checkDatabase() {
        const startTime = Date.now();
        try {
            const isHealthy = await this.prisma.healthCheck();
            const responseTime = Date.now() - startTime;
            const poolStats = env_1.env.NODE_ENV !== 'production'
                ? this.prisma.getConnectionStats()
                : undefined;
            return {
                name: 'database',
                status: isHealthy ? 'up' : 'down',
                responseTime,
                metadata: poolStats,
            };
        }
        catch (error) {
            this.logger.error('Database health check failed:', error);
            return {
                name: 'database',
                status: 'down',
                responseTime: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async checkCache() {
        const startTime = Date.now();
        try {
            await this.cache.ping();
            const responseTime = Date.now() - startTime;
            return {
                name: 'cache',
                status: 'up',
                responseTime,
            };
        }
        catch (error) {
            this.logger.warn('Cache health check failed (optional service):', error);
            return {
                name: 'cache',
                status: 'degraded',
                responseTime: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    getHello() {
        return 'Bellybook API is running!';
    }
};
exports.AppService = AppService;
exports.AppService = AppService = AppService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService])
], AppService);
//# sourceMappingURL=app.service.js.map
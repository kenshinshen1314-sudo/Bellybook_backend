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
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const env_1 = require("../config/env");
const SLOW_QUERY_THRESHOLD = 100;
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    logger = new common_1.Logger(PrismaService_1.name);
    queryStartTime = new Map();
    stats = {
        totalQueries: 0,
        totalQueryTime: 0,
        slowQueries: 0,
        failedQueries: 0,
    };
    constructor() {
        super({
            log: [
                { level: 'query', emit: 'event' },
                { level: 'error', emit: 'stdout' },
                { level: 'warn', emit: 'stdout' },
            ],
            datasources: {
                db: {
                    url: env_1.env.DATABASE_URL,
                },
            },
            errorFormat: 'minimal',
        });
        this.$on('query', (e) => {
            const queryKey = `${e.timestamp}_${e.query.substring(0, 50)}`;
            this.queryStartTime.set(queryKey, Date.now());
        });
        this.$on('query', (e) => {
            const queryKey = `${e.timestamp}_${e.query.substring(0, 50)}`;
            const startTime = this.queryStartTime.get(queryKey);
            if (startTime) {
                const duration = Date.now() - startTime;
                this.stats.totalQueries++;
                this.stats.totalQueryTime += duration;
                if (duration > SLOW_QUERY_THRESHOLD) {
                    this.stats.slowQueries++;
                    this.logger.warn(`Slow query (${duration}ms): ${e.query.substring(0, 100)}...`);
                }
                this.queryStartTime.delete(queryKey);
            }
        });
        this.$on('error', (e) => {
            this.stats.failedQueries++;
            this.logger.error(`Database error: ${e.message}`);
        });
    }
    async onModuleInit() {
        await this.$connect();
        this.logger.log('Database connected');
    }
    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log('Database disconnected');
    }
    async runTransaction(callback, options) {
        const startTime = Date.now();
        const maxRetries = 3;
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const isConnected = await this.healthCheck();
                if (!isConnected) {
                    this.logger.warn(`Database not connected, attempting to reconnect (attempt ${attempt}/${maxRetries})...`);
                    await this.$disconnect();
                    await this.$connect();
                }
                const result = await this.$transaction(callback, {
                    maxWait: options?.maxWait ?? 15000,
                    timeout: options?.timeout ?? 45000,
                    isolationLevel: options?.isolationLevel,
                });
                const duration = Date.now() - startTime;
                this.logger.debug(`Transaction completed in ${duration}ms${attempt > 1 ? ` (retry ${attempt})` : ''}`);
                return result;
            }
            catch (error) {
                lastError = error;
                const duration = Date.now() - startTime;
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                    const isTransactionError = error.message.includes('Transaction') &&
                        (error.message.includes('not found') ||
                            error.message.includes('invalid') ||
                            error.message.includes('disconnected') ||
                            error.message.includes('timeout'));
                    if (isTransactionError && attempt < maxRetries) {
                        this.logger.warn(`Transaction attempt ${attempt} failed after ${duration}ms, retrying... Error: ${error.message}`);
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
                        continue;
                    }
                    this.logger.error(`Transaction failed after ${duration}ms: ${error.code} - ${error.message}`);
                    switch (error.code) {
                        case 'P2002':
                            throw new common_1.ConflictException(`唯一约束冲突: ${error.meta?.target?.join(', ')}`);
                        case 'P2025':
                            throw new common_1.NotFoundException('记录不存在');
                        case 'P2034':
                            throw new common_1.ConflictException('事务写入冲突，请重试');
                        default:
                            throw error;
                    }
                }
                if (attempt < maxRetries &&
                    (lastError.message.includes('Transaction') || lastError.message.includes('database'))) {
                    this.logger.warn(`Transaction attempt ${attempt} failed after ${duration}ms, retrying... Error: ${lastError.message}`);
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
                    continue;
                }
                this.logger.error(`Transaction failed after ${duration}ms: ${lastError}`);
                throw lastError;
            }
        }
        throw lastError || new Error('Transaction failed with unknown error');
    }
    async batchTransactions(callbacks) {
        return this.$transaction(async (tx) => {
            return Promise.all(callbacks.map((fn) => fn(tx)));
        });
    }
    async cleanDatabase() {
        if (process.env.NODE_ENV === 'production') {
            throw new common_1.ForbiddenException('Cannot clean database in production');
        }
        this.logger.warn('Cleaning database...');
        const models = Reflect.ownKeys(this).filter((key) => typeof key === 'string' && key[0] !== '_' && key[0] !== '$');
        const deleteOrder = [
            'dishUnlock', 'dailyNutrition', 'refreshToken',
            'meal', 'userSettings', 'userProfile', 'user', 'dish',
        ];
        const results = {};
        for (const modelName of deleteOrder) {
            const model = this[modelName];
            if (model && typeof model.deleteMany === 'function') {
                const result = await model.deleteMany({});
                results[modelName] = result.count;
            }
        }
        this.logger.log(`Database cleaned: ${JSON.stringify(results)}`);
        return results;
    }
    async healthCheck() {
        try {
            await this.$queryRaw `SELECT 1`;
            return true;
        }
        catch {
            return false;
        }
    }
    getConnectionStats() {
        const avgQueryTime = this.stats.totalQueries > 0
            ? Math.round(this.stats.totalQueryTime / this.stats.totalQueries)
            : 0;
        const url = new URL(env_1.env.DATABASE_URL);
        const connectionLimit = parseInt(url.searchParams.get('connection_limit') || '10', 10);
        return {
            connected: true,
            totalConnections: connectionLimit,
            activeConnections: Math.min(connectionLimit, this.stats.totalQueries),
            idleConnections: Math.max(0, connectionLimit - Math.min(connectionLimit, this.stats.totalQueries)),
            failedConnections: this.stats.failedQueries,
            avgQueryTime,
            slowQueries: this.stats.slowQueries,
        };
    }
    getPerformanceReport() {
        const stats = this.getConnectionStats();
        return {
            ...stats,
            totalQueries: this.stats.totalQueries,
            querySuccessRate: this.stats.totalQueries > 0
                ? ((this.stats.totalQueries - this.stats.failedQueries) / this.stats.totalQueries * 100).toFixed(2) + '%'
                : '100%',
            slowQueryRate: this.stats.totalQueries > 0
                ? (this.stats.slowQueries / this.stats.totalQueries * 100).toFixed(2) + '%'
                : '0%',
        };
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map
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
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    logger = new common_1.Logger(PrismaService_1.name);
    constructor() {
        super({
            log: ['query', 'error', 'warn'],
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
        try {
            const result = await this.$transaction(callback, {
                maxWait: options?.maxWait ?? 5000,
                timeout: options?.timeout ?? 10000,
                isolationLevel: options?.isolationLevel,
            });
            const duration = Date.now() - startTime;
            this.logger.debug(`Transaction completed in ${duration}ms`);
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                this.logger.error(`Transaction failed after ${duration}ms: ${error.code} - ${error.message}`);
                switch (error.code) {
                    case 'P2002':
                        throw new Error(`唯一约束冲突: ${error.meta?.target?.join(', ')}`);
                    case 'P2025':
                        throw new Error('记录不存在');
                    case 'P2034':
                        throw new Error('事务写入冲突，请重试');
                    default:
                        throw error;
                }
            }
            this.logger.error(`Transaction failed after ${duration}ms: ${error}`);
            throw error;
        }
    }
    async batchTransactions(callbacks) {
        return this.$transaction(async (tx) => {
            return Promise.all(callbacks.map((fn) => fn(tx)));
        });
    }
    async cleanDatabase() {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Cannot clean database in production');
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
        return {
            connected: true,
        };
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map
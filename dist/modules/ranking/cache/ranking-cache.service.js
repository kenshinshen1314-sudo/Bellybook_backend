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
var RankingCacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RankingCacheService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../database/prisma.service");
const client_1 = require("@prisma/client");
const CACHE_TTL_MINUTES = 5;
let RankingCacheService = RankingCacheService_1 = class RankingCacheService {
    prisma;
    logger = new common_1.Logger(RankingCacheService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async get(key) {
        const cache = await this.prisma.ranking_caches.findUnique({
            where: { id: key },
        });
        if (!cache)
            return null;
        if (cache.expiresAt < new Date()) {
            await this.delete(key);
            return null;
        }
        this.logger.debug(`Cache hit: ${key}`);
        return cache.rankings;
    }
    async set(key, data, ttlMinutes = CACHE_TTL_MINUTES) {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);
        await this.prisma.ranking_caches.upsert({
            where: { id: key },
            create: {
                id: key,
                period: client_1.RankingPeriod.ALL_TIME,
                rankings: data,
                expiresAt,
            },
            update: {
                rankings: data,
                expiresAt,
                updatedAt: new Date(),
            },
        });
        this.logger.debug(`Cache set: ${key}, TTL: ${ttlMinutes}min`);
    }
    async delete(key) {
        try {
            await this.prisma.ranking_caches.delete({ where: { id: key } });
            this.logger.debug(`Cache deleted: ${key}`);
        }
        catch (error) {
            this.logger.debug(`Cache delete skipped (not found): ${key}`);
        }
    }
    async clearExpired() {
        const result = await this.prisma.ranking_caches.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
        if (result.count > 0) {
            this.logger.log(`Cleared ${result.count} expired cache entries`);
        }
    }
    async clearAll() {
        const result = await this.prisma.ranking_caches.deleteMany({});
        this.logger.log(`Cleared all cache entries: ${result.count}`);
    }
};
exports.RankingCacheService = RankingCacheService;
exports.RankingCacheService = RankingCacheService = RankingCacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RankingCacheService);
//# sourceMappingURL=ranking-cache.service.js.map
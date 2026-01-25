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
var CacheStatsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheStatsService = void 0;
const common_1 = require("@nestjs/common");
const prom_client_1 = require("prom-client");
const register = new prom_client_1.Registry();
let CacheStatsService = CacheStatsService_1 = class CacheStatsService {
    logger = new common_1.Logger(CacheStatsService_1.name);
    hitsCounter;
    missesCounter;
    setCounter;
    deleteCounter;
    errorCounter;
    getDuration;
    setDuration;
    cacheSize;
    constructor() {
        this.hitsCounter = new prom_client_1.Counter({
            name: 'cache_hits_total',
            help: 'Total number of cache hits',
            labelNames: ['prefix'],
            registers: [register],
        });
        this.missesCounter = new prom_client_1.Counter({
            name: 'cache_misses_total',
            help: 'Total number of cache misses',
            labelNames: ['prefix'],
            registers: [register],
        });
        this.setCounter = new prom_client_1.Counter({
            name: 'cache_sets_total',
            help: 'Total number of cache sets',
            labelNames: ['prefix'],
            registers: [register],
        });
        this.deleteCounter = new prom_client_1.Counter({
            name: 'cache_deletes_total',
            help: 'Total number of cache deletes',
            labelNames: ['prefix'],
            registers: [register],
        });
        this.errorCounter = new prom_client_1.Counter({
            name: 'cache_errors_total',
            help: 'Total number of cache errors',
            labelNames: ['operation', 'prefix'],
            registers: [register],
        });
        this.getDuration = new prom_client_1.Histogram({
            name: 'cache_get_duration_seconds',
            help: 'Cache get operation duration in seconds',
            labelNames: ['prefix'],
            buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
            registers: [register],
        });
        this.setDuration = new prom_client_1.Histogram({
            name: 'cache_set_duration_seconds',
            help: 'Cache set operation duration in seconds',
            labelNames: ['prefix'],
            buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
            registers: [register],
        });
        this.cacheSize = new prom_client_1.Gauge({
            name: 'cache_size',
            help: 'Current number of cached items by prefix',
            labelNames: ['prefix'],
            registers: [register],
        });
    }
    recordHit(key) {
        const prefix = this.extractPrefix(key);
        this.hitsCounter.inc({ prefix });
        this.logger.debug(`Cache HIT: ${key}`);
    }
    recordMiss(key) {
        const prefix = this.extractPrefix(key);
        this.missesCounter.inc({ prefix });
        this.logger.debug(`Cache MISS: ${key}`);
    }
    recordSet(key) {
        const prefix = this.extractPrefix(key);
        this.setCounter.inc({ prefix });
        this.cacheSize.inc({ prefix });
    }
    recordDelete(key) {
        const prefix = this.extractPrefix(key);
        this.deleteCounter.inc({ prefix });
        this.cacheSize.dec({ prefix });
    }
    recordError(operation, key) {
        const prefix = this.extractPrefix(key);
        this.errorCounter.inc({ operation, prefix });
    }
    recordGetDuration(key, duration) {
        const prefix = this.extractPrefix(key);
        this.getDuration.observe({ prefix }, duration);
    }
    recordSetDuration(key, duration) {
        const prefix = this.extractPrefix(key);
        this.setDuration.observe({ prefix }, duration);
    }
    async getHitRate() {
        const hits = await this.hitsCounter.get();
        const misses = await this.missesCounter.get();
        const totalHits = hits.values.reduce((sum, metric) => sum + metric.value, 0);
        const totalMisses = misses.values.reduce((sum, metric) => sum + metric.value, 0);
        const total = totalHits + totalMisses;
        return total > 0 ? totalHits / total : 0;
    }
    async getMetrics() {
        return register.metrics();
    }
    async getSummary() {
        const hits = await this.hitsCounter.get();
        const misses = await this.missesCounter.get();
        const sets = await this.setCounter.get();
        const deletes = await this.deleteCounter.get();
        const errors = await this.errorCounter.get();
        const totalHits = hits.values.reduce((sum, m) => sum + m.value, 0);
        const totalMisses = misses.values.reduce((sum, m) => sum + m.value, 0);
        const totalSets = sets.values.reduce((sum, m) => sum + m.value, 0);
        const totalDeletes = deletes.values.reduce((sum, m) => sum + m.value, 0);
        const totalErrors = errors.values.reduce((sum, m) => sum + m.value, 0);
        return {
            hits: totalHits,
            misses: totalMisses,
            hitRate: await this.getHitRate(),
            sets: totalSets,
            deletes: totalDeletes,
            errors: totalErrors,
        };
    }
    reset() {
        this.hitsCounter.reset();
        this.missesCounter.reset();
        this.setCounter.reset();
        this.deleteCounter.reset();
        this.errorCounter.reset();
        this.logger.log('Cache statistics reset');
    }
    extractPrefix(key) {
        const parts = key.split(':');
        return parts[0] || 'unknown';
    }
};
exports.CacheStatsService = CacheStatsService;
exports.CacheStatsService = CacheStatsService = CacheStatsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], CacheStatsService);
//# sourceMappingURL=cache-stats.service.js.map
/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供缓存统计指标收集和查询
 * [POS]: cache 模块的统计服务层
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Injectable, Logger } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry } from 'prom-client';

// 注册 Prometheus 指标
const register = new Registry();

@Injectable()
export class CacheStatsService {
  private readonly logger = new Logger(CacheStatsService.name);

  // 命中/未命中计数器
  private hitsCounter: Counter<string>;
  private missesCounter: Counter<string>;

  // 操作计数器
  private setCounter: Counter<string>;
  private deleteCounter: Counter<string>;
  private errorCounter: Counter<string>;

  // 响应时间直方图
  private getDuration: Histogram<string>;
  private setDuration: Histogram<string>;

  // 当前缓存大小
  private cacheSize: Gauge<string>;

  constructor() {
    // 初始化指标
    this.hitsCounter = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['prefix'],
      registers: [register],
    });

    this.missesCounter = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['prefix'],
      registers: [register],
    });

    this.setCounter = new Counter({
      name: 'cache_sets_total',
      help: 'Total number of cache sets',
      labelNames: ['prefix'],
      registers: [register],
    });

    this.deleteCounter = new Counter({
      name: 'cache_deletes_total',
      help: 'Total number of cache deletes',
      labelNames: ['prefix'],
      registers: [register],
    });

    this.errorCounter = new Counter({
      name: 'cache_errors_total',
      help: 'Total number of cache errors',
      labelNames: ['operation', 'prefix'],
      registers: [register],
    });

    this.getDuration = new Histogram({
      name: 'cache_get_duration_seconds',
      help: 'Cache get operation duration in seconds',
      labelNames: ['prefix'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
      registers: [register],
    });

    this.setDuration = new Histogram({
      name: 'cache_set_duration_seconds',
      help: 'Cache set operation duration in seconds',
      labelNames: ['prefix'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
      registers: [register],
    });

    this.cacheSize = new Gauge({
      name: 'cache_size',
      help: 'Current number of cached items by prefix',
      labelNames: ['prefix'],
      registers: [register],
    });
  }

  /**
   * 记录缓存命中
   */
  recordHit(key: string): void {
    const prefix = this.extractPrefix(key);
    this.hitsCounter.inc({ prefix });
    this.logger.debug(`Cache HIT: ${key}`);
  }

  /**
   * 记录缓存未命中
   */
  recordMiss(key: string): void {
    const prefix = this.extractPrefix(key);
    this.missesCounter.inc({ prefix });
    this.logger.debug(`Cache MISS: ${key}`);
  }

  /**
   * 记录缓存设置
   */
  recordSet(key: string): void {
    const prefix = this.extractPrefix(key);
    this.setCounter.inc({ prefix });
    this.cacheSize.inc({ prefix });
  }

  /**
   * 记录缓存删除
   */
  recordDelete(key: string): void {
    const prefix = this.extractPrefix(key);
    this.deleteCounter.inc({ prefix });
    this.cacheSize.dec({ prefix });
  }

  /**
   * 记录缓存错误
   */
  recordError(operation: string, key: string): void {
    const prefix = this.extractPrefix(key);
    this.errorCounter.inc({ operation, prefix });
  }

  /**
   * 记录获取操作耗时
   */
  recordGetDuration(key: string, duration: number): void {
    const prefix = this.extractPrefix(key);
    this.getDuration.observe({ prefix }, duration);
  }

  /**
   * 记录设置操作耗时
   */
  recordSetDuration(key: string, duration: number): void {
    const prefix = this.extractPrefix(key);
    this.setDuration.observe({ prefix }, duration);
  }

  /**
   * 获取命中率统计
   */
  async getHitRate(): Promise<number> {
    const hits = await this.hitsCounter.get();
    const misses = await this.missesCounter.get();

    const totalHits = hits.values.reduce((sum: number, metric: { value: number }) => sum + metric.value, 0);
    const totalMisses = misses.values.reduce((sum: number, metric: { value: number }) => sum + metric.value, 0);
    const total = totalHits + totalMisses;

    return total > 0 ? totalHits / total : 0;
  }

  /**
   * 获取 Prometheus 指标
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * 获取统计摘要
   */
  async getSummary(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    sets: number;
    deletes: number;
    errors: number;
  }> {
    const hits = await this.hitsCounter.get();
    const misses = await this.missesCounter.get();
    const sets = await this.setCounter.get();
    const deletes = await this.deleteCounter.get();
    const errors = await this.errorCounter.get();

    const totalHits = hits.values.reduce((sum: number, m: { value: number }) => sum + m.value, 0);
    const totalMisses = misses.values.reduce((sum: number, m: { value: number }) => sum + m.value, 0);
    const totalSets = sets.values.reduce((sum: number, m: { value: number }) => sum + m.value, 0);
    const totalDeletes = deletes.values.reduce((sum: number, m: { value: number }) => sum + m.value, 0);
    const totalErrors = errors.values.reduce((sum: number, m: { value: number }) => sum + m.value, 0);

    return {
      hits: totalHits,
      misses: totalMisses,
      hitRate: await this.getHitRate(),
      sets: totalSets,
      deletes: totalDeletes,
      errors: totalErrors,
    };
  }

  /**
   * 重置所有统计
   */
  reset(): void {
    this.hitsCounter.reset();
    this.missesCounter.reset();
    this.setCounter.reset();
    this.deleteCounter.reset();
    this.errorCounter.reset();
    this.logger.log('Cache statistics reset');
  }

  /**
   * 提取缓存键前缀
   */
  private extractPrefix(key: string): string {
    const parts = key.split(':');
    return parts[0] || 'unknown';
  }
}

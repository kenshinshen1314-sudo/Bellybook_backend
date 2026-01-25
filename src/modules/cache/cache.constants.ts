/**
 * [INPUT]: 无依赖，纯常量定义
 * [OUTPUT]: 对外提供缓存相关的所有常量定义
 * [POS]: cache 模块的常量契约
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

/**
 * 缓存 TTL 配置（秒）
 */
export const CacheTTL = {
  SHORT: 60,           // 1 分钟 - 频繁变化的数据
  MEDIUM: 300,         // 5 分钟 - 默认
  LONG: 1800,          // 30 分钟 - 相对稳定的数据
  VERY_LONG: 3600,     // 1 小时 - 很少变化的数据
  DAILY: 86400,        // 1 天 - 静态数据
} as const;

/**
 * 缓存键前缀
 */
export const CachePrefix = {
  USER: 'user',
  USER_PROFILE: 'user:profile',
  USER_SETTINGS: 'user:settings',
  RANKING: 'ranking',
  CUISINE_CONFIGS: 'cuisine:configs',
  DISH_INFO: 'dish:info',
  AI_ANALYSIS: 'ai:analysis',
  MEAL: 'meal',
  DISH_UNLOCKS: 'dish:unlocks',
  CUISINE_UNLOCKS: 'cuisine:unlocks',
  DAILY_NUTRITION: 'daily:nutrition',
} as const;

/**
 * 缓存统计标签
 */
export const CacheMetrics = {
  HIT: 'cache_hit',
  MISS: 'cache_miss',
  SET: 'cache_set',
  DELETE: 'cache_delete',
  ERROR: 'cache_error',
} as const;

/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供缓存服务的测试用例
 * [POS]: cache 模块的测试文件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import { CacheStatsService } from './cache-stats.service';
import { CacheTTL, CachePrefix } from './cache.constants';

// Mock redis module
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockRejectedValue(new Error('Redis not available in test')),
    on: jest.fn(),
    scan: jest.fn().mockResolvedValue({
      cursor: 0,
      keys: [],
    }),
    del: jest.fn(),
    multi: jest.fn().mockReturnValue({
      setEx: jest.fn(),
      set: jest.fn(),
      exec: jest.fn().mockResolvedValue([]),
    }),
    mGet: jest.fn().mockResolvedValue([]),
    exists: jest.fn().mockResolvedValue(0),
    set: jest.fn().mockResolvedValue('OK'),
    flushDb: jest.fn().mockResolvedValue('OK'),
  })),
}));

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: jest.Mocked<any>;
  let statsService: jest.Mocked<CacheStatsService>;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockStatsService = {
    recordHit: jest.fn(),
    recordMiss: jest.fn(),
    recordSet: jest.fn(),
    recordDelete: jest.fn(),
    recordError: jest.fn(),
    recordGetDuration: jest.fn(),
    recordSetDuration: jest.fn(),
    getSummary: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: CacheStatsService,
          useValue: mockStatsService,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    cacheManager = module.get(CACHE_MANAGER);
    statsService = module.get(CacheStatsService);

    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return cached value and record hit', async () => {
      const key = 'test:key';
      const value = { data: 'test' };

      mockCacheManager.get.mockResolvedValue(value);

      const result = await service.get(key);

      expect(result).toEqual(value);
      expect(statsService.recordHit).toHaveBeenCalledWith(key);
      expect(statsService.recordGetDuration).toHaveBeenCalled();
    });

    it('should return undefined and record miss', async () => {
      const key = 'test:key';

      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.get(key);

      expect(result).toBeUndefined();
      expect(statsService.recordMiss).toHaveBeenCalledWith(key);
    });

    it('should handle errors gracefully', async () => {
      const key = 'test:key';

      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      const result = await service.get(key);

      expect(result).toBeUndefined();
      expect(statsService.recordError).toHaveBeenCalledWith('get', key);
    });
  });

  describe('set', () => {
    it('should set value and record stat', async () => {
      const key = 'test:key';
      const value = { data: 'test' };
      const ttl = CacheTTL.MEDIUM;

      mockCacheManager.set.mockResolvedValue(undefined);

      await service.set(key, value, ttl);

      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, ttl);
      expect(statsService.recordSet).toHaveBeenCalledWith(key);
      expect(statsService.recordSetDuration).toHaveBeenCalled();
    });

    it('should handle set errors gracefully', async () => {
      const key = 'test:key';
      const value = { data: 'test' };

      mockCacheManager.set.mockRejectedValue(new Error('Cache error'));

      await expect(service.set(key, value)).resolves.not.toThrow();
      expect(statsService.recordError).toHaveBeenCalledWith('set', key);
    });
  });

  describe('del', () => {
    it('should delete value and record stat', async () => {
      const key = 'test:key';

      mockCacheManager.del.mockResolvedValue(undefined);

      await service.del(key);

      expect(mockCacheManager.del).toHaveBeenCalledWith(key);
      expect(statsService.recordDelete).toHaveBeenCalledWith(key);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const key = 'test:key';
      const cachedValue = { data: 'cached' };
      const factory = jest.fn().mockResolvedValue({ data: 'new' });

      mockCacheManager.get.mockResolvedValue(cachedValue);

      const result = await service.getOrSet(key, factory);

      expect(result).toEqual(cachedValue);
      expect(factory).not.toHaveBeenCalled();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('should call factory and cache result on miss', async () => {
      const key = 'test:key';
      const newValue = { data: 'new' };
      const factory = jest.fn().mockResolvedValue(newValue);

      mockCacheManager.get.mockResolvedValue(undefined);
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.getOrSet(key, factory, CacheTTL.SHORT);

      expect(factory).toHaveBeenCalled();
      expect(result).toEqual(newValue);
      expect(mockCacheManager.set).toHaveBeenCalledWith(key, newValue, CacheTTL.SHORT);
    });

    it('should cache null values with short TTL', async () => {
      const key = 'test:key';
      const factory = jest.fn().mockResolvedValue(null);

      mockCacheManager.get.mockResolvedValue(undefined);
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.getOrSet(key, factory);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        key,
        { __NULL: true },
        CacheTTL.SHORT
      );
    });
  });

  describe('exists', () => {
    it('should return true if key exists', async () => {
      const key = 'test:key';

      mockCacheManager.get.mockResolvedValue({ data: 'test' });

      const result = await service.exists(key);

      expect(result).toBe(true);
    });

    it('should return false if key does not exist', async () => {
      const key = 'test:key';

      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.exists(key);

      expect(result).toBe(false);
    });
  });

  describe('setNX', () => {
    it('should set value if key does not exist', async () => {
      const key = 'test:key';
      const value = { data: 'test' };

      mockCacheManager.get.mockResolvedValue(undefined);
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.setNX(key, value, CacheTTL.SHORT);

      expect(result).toBe(true);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should not set value if key exists', async () => {
      const key = 'test:key';
      const value = { data: 'new' };

      mockCacheManager.get.mockResolvedValue({ data: 'existing' });

      const result = await service.setNX(key, value, CacheTTL.SHORT);

      expect(result).toBe(false);
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return stats summary', async () => {
      const summary = {
        hits: 100,
        misses: 10,
        hitRate: 0.91,
        sets: 50,
        deletes: 5,
        errors: 1,
      };

      mockStatsService.getSummary.mockResolvedValue(summary);

      const result = await service.getStats();

      expect(result).toEqual(summary);
    });
  });

  describe('getWithPrefix', () => {
    it('should get value with prefix', async () => {
      const prefix = CachePrefix.USER;
      const key = '123';
      const value = { id: '123', name: 'Test User' };

      mockCacheManager.get.mockResolvedValue(value);

      const result = await service.getWithPrefix(prefix, key);

      expect(mockCacheManager.get).toHaveBeenCalledWith('user:123');
      expect(result).toEqual(value);
    });
  });

  describe('setWithPrefix', () => {
    it('should set value with prefix', async () => {
      const prefix = CachePrefix.USER;
      const key = '123';
      const value = { id: '123', name: 'Test User' };

      mockCacheManager.set.mockResolvedValue(undefined);

      await service.setWithPrefix(prefix, key, value, CacheTTL.MEDIUM);

      expect(mockCacheManager.set).toHaveBeenCalledWith('user:123', value, CacheTTL.MEDIUM);
    });
  });

  describe('delWithPrefix', () => {
    it('should delete value with prefix', async () => {
      const prefix = CachePrefix.USER;
      const key = '123';

      mockCacheManager.del.mockResolvedValue(undefined);

      await service.delWithPrefix(prefix, key);

      expect(mockCacheManager.del).toHaveBeenCalledWith('user:123');
    });
  });
});

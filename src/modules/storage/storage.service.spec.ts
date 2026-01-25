/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供存储服务的测试用例
 * [POS]: storage 模块的测试文件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { BadRequestException } from '@nestjs/common';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
        remove: jest.fn(),
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
      })),
    },
  })),
}));

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageService],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadImage', () => {
    it('should throw BadRequestException when no file provided', async () => {
      await expect(service.uploadImage('user123', null as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when file has no buffer', async () => {
      const file = { originalname: 'test.jpg', mimetype: 'image/jpeg' } as any;

      await expect(service.uploadImage('user123', file)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid file type', async () => {
      const file = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('test'),
        size: 1000,
      } as Express.Multer.File;

      // Mock process.env to set allowed types
      const originalAllowedTypes = process.env.ALLOWED_IMAGE_TYPES;
      process.env.ALLOWED_IMAGE_TYPES = 'image/jpeg,image/png';

      await expect(service.uploadImage('user123', file)).rejects.toThrow(BadRequestException);

      process.env.ALLOWED_IMAGE_TYPES = originalAllowedTypes;
    });

    it('should throw BadRequestException for file too large', async () => {
      const file = {
        originalname: 'large.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test'),
        size: 10 * 1024 * 1024 + 1, // Larger than MAX_FILE_SIZE
      } as Express.Multer.File;

      const originalMaxSize = process.env.MAX_FILE_SIZE;
      process.env.MAX_FILE_SIZE = '10485760';

      await expect(service.uploadImage('user123', file)).rejects.toThrow(BadRequestException);

      process.env.MAX_FILE_SIZE = originalMaxSize;
    });
  });

  describe('fileToBase64', () => {
    it('should convert file buffer to base64', () => {
      const file = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test content'),
      } as Express.Multer.File;

      const result = service.fileToBase64(file);

      // The actual service just returns base64 string, no data URI prefix
      expect(result).toBe('dGVzdCBjb250ZW50');
    });

    it('should handle unknown mime types', () => {
      const file = {
        originalname: 'test.xyz',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const result = service.fileToBase64(file);

      // The actual service just returns base64 string, no data URI prefix
      expect(result).toBe('dGVzdA==');
    });
  });

  describe('deleteFile', () => {
    it('should delete file from storage', async () => {
      const mockRemove = jest.fn().mockResolvedValue({ error: null });
      service['supabase'] = {
        storage: {
          from: jest.fn(() => ({
            remove: mockRemove,
          })),
        },
      };

      await expect(service.deleteFile('user123/image.jpg')).resolves.not.toThrow();

      expect(mockRemove).toHaveBeenCalledWith(['user123/image.jpg']);
    });

    it('should throw BadRequestException when delete fails', async () => {
      const mockRemove = jest.fn().mockResolvedValue({
        error: { message: 'File not found' },
      });
      service['supabase'] = {
        storage: {
          from: jest.fn(() => ({
            remove: mockRemove,
          })),
        },
      };

      await expect(service.deleteFile('user123/image.jpg')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPresignedUrl', () => {
    it('should return presigned URL info', () => {
      const result = service.getPresignedUrl('test.jpg', 'image/jpeg');

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
      expect(result.key).toContain('test.jpg');
    });
  });
});

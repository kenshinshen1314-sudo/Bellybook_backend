import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userProfile: {
      findUnique: jest.fn(),
    },
    userSettings: {
      findUnique: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto: RegisterDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      };

      const hashedPassword = 'hashedPassword';
      jest.spyOn(CryptoUtil, 'hashPassword').mockResolvedValue(hashedPassword);
      jest.spyOn(CryptoUtil, 'generateRandomToken').mockReturnValue('refreshToken');

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'userId123',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        subscriptionTier: 'FREE',
        createdAt: new Date(),
        profile: null,
        settings: null,
      });

      mockJwtService.signAsync.mockResolvedValue('accessToken');
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.username).toBe('testuser');
      expect(CryptoUtil.hashPassword).toHaveBeenCalledWith('password123');
    });

    it('should throw ConflictException if username exists', async () => {
      const registerDto: RegisterDto = {
        username: 'existinguser',
        password: 'password123',
      };

      mockPrismaService.user.findFirst.mockResolvedValue({
        username: 'existinguser',
      });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('Username already exists');
    });

    it('should throw ConflictException if email exists', async () => {
      const registerDto: RegisterDto = {
        username: 'testuser',
        email: 'existing@example.com',
        password: 'password123',
      };

      mockPrismaService.user.findFirst.mockResolvedValue({
        email: 'existing@example.com',
      });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('Email already exists');
    });

    it('should register without email', async () => {
      const registerDto: RegisterDto = {
        username: 'testuser',
        password: 'password123',
      };

      jest.spyOn(CryptoUtil, 'hashPassword').mockResolvedValue('hashedPassword');
      jest.spyOn(CryptoUtil, 'generateRandomToken').mockReturnValue('refreshToken');

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'userId123',
        username: 'testuser',
        subscriptionTier: 'FREE',
        createdAt: new Date(),
      });

      mockJwtService.signAsync.mockResolvedValue('accessToken');
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.register(registerDto);

      expect(result.user.username).toBe('testuser');
    });
  });

  describe('login', () => {
    it('should successfully login with correct credentials', async () => {
      const loginDto: LoginDto = {
        username: 'testuser',
        password: 'password123',
      };

      const hashedPassword = 'hashedPassword';
      const user = {
        id: 'userId123',
        username: 'testuser',
        passwordHash: hashedPassword,
        email: 'test@example.com',
        subscriptionTier: 'FREE',
        createdAt: new Date(),
        profile: null,
        settings: null,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(user);
      jest.spyOn(CryptoUtil, 'comparePassword').mockResolvedValue(true);
      jest.spyOn(CryptoUtil, 'generateRandomToken').mockReturnValue('refreshToken');
      mockJwtService.signAsync.mockResolvedValue('accessToken');
      mockPrismaService.user.update.mockResolvedValue(user);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result.user.username).toBe('testuser');
      expect(CryptoUtil.comparePassword).toHaveBeenCalledWith('password123', hashedPassword);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto: LoginDto = {
        username: 'nonexistent',
        password: 'password123',
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const loginDto: LoginDto = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      const user = {
        id: 'userId123',
        username: 'testuser',
        passwordHash: 'hashedPassword',
      };

      mockPrismaService.user.findFirst.mockResolvedValue(user);
      jest.spyOn(CryptoUtil, 'comparePassword').mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should login with email instead of username', async () => {
      const loginDto: LoginDto = {
        username: 'test@example.com',
        password: 'password123',
      };

      const user = {
        id: 'userId123',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        subscriptionTier: 'FREE',
        createdAt: new Date(),
      };

      mockPrismaService.user.findFirst.mockResolvedValue(user);
      jest.spyOn(CryptoUtil, 'comparePassword').mockResolvedValue(true);
      jest.spyOn(CryptoUtil, 'generateRandomToken').mockReturnValue('refreshToken');
      mockJwtService.signAsync.mockResolvedValue('accessToken');
      mockPrismaService.user.update.mockResolvedValue(user);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result.user.username).toBeDefined();
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const userId = 'userId123';

      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout(userId);

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should return user data', async () => {
      const userId = 'userId123';

      const user = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        subscriptionTier: 'FREE',
        createdAt: new Date(),
        profile: {
          displayName: 'Test User',
        },
        settings: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.getCurrentUser(userId);

      expect(result.id).toBe(userId);
      expect(result.username).toBe('testuser');
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'nonexistent';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCurrentUser(userId)).rejects.toThrow(NotFoundException);
    });
  });
});

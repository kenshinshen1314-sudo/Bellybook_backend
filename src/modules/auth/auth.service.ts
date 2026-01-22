/**
 * [INPUT]: 依赖 PrismaService 的数据库访问、JwtService 的令牌生成、CryptoUtil 的密码哈希
 * [OUTPUT]: 对外提供用户注册、登录、登出、令牌刷新、用户查询
 * [POS]: auth 模块的核心服务层，被 auth.controller 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { env } from '../../config/env';
import { CurrentUserData } from '../../common/decorators/current-user.decorator';
import {
  CreateUserData,
  GeneratedTokens,
  PrismaUser,
} from './auth.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ============================================================
  // 公共方法 - 认证流程
  // ============================================================

  /**
   * 用户注册
   *
   * 流程：
   * 1. 检查用户名/邮箱是否已存在
   * 2. 哈希密码
   * 3. 创建用户记录（事务中完成）
   * 4. 生成令牌
   * 5. 存储刷新令牌
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // 检查用户是否已存在
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.username },
          { email: dto.email || '' },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.username === dto.username) {
        throw new ConflictException('Username already exists');
      }
      if (existingUser.email === dto.email) {
        throw new ConflictException('Email already exists');
      }
    }

    // 哈希密码
    const passwordHash = await CryptoUtil.hashPassword(dto.password);

    // 构建用户数据（强类型）
    const userData: CreateUserData = {
      username: dto.username,
      passwordHash,
      displayName: dto.displayName || dto.username,
      reminderTime: '12:00',
    };

    // 只有 email 有值时才添加
    if (dto.email) {
      userData.email = dto.email;
    }

    // 使用事务创建用户（原子操作）
    const user = await this.prisma.runTransaction(async (tx) => {
      return tx.user.create({
        data: {
          username: userData.username,
          passwordHash: userData.passwordHash,
          email: userData.email,
          displayName: userData.displayName,
          user_settings: {
            create: {},
          },
          user_profiles: {
            create: {
              displayName: userData.displayName,
            },
          },
        },
      });
    });

    // 生成令牌
    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`User registered: ${user.username}`);

    return {
      user: this.mapToUserResponse(user),
      ...tokens,
    };
  }

  /**
   * 用户登录
   *
   * 流程：
   * 1. 查找用户（支持用户名或邮箱）
   * 2. 验证密码
   * 3. 更新最后登录时间
   * 4. 生成令牌
   * 5. 存储刷新令牌
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // 查找用户
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.username },
          { email: dto.username },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 验证密码
    const isValid = await CryptoUtil.comparePassword(
      dto.password,
      user.passwordHash,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 更新最后登录时间
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 生成令牌
    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`User logged in: ${user.username}`);

    return {
      user: this.mapToUserResponse(user),
      ...tokens,
    };
  }

  /**
   * 用户登出
   *
   * 撤销用户所有刷新令牌
   */
  async logout(userId: string): Promise<void> {
    await this.prisma.refresh_tokens.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    this.logger.log(`User logged out: ${userId}`);
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToUserResponse(user);
  }

  /**
   * 刷新令牌
   *
   * 流程：
   * 1. 验证刷新令牌
   * 2. 检查是否被撤销或过期
   * 3. 撤销旧令牌
   * 4. 生成新令牌
   */
  async refreshTokens(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const refreshToken = await this.prisma.refresh_tokens.findUnique({
      where: { token: dto.refreshToken },
      include: { users: true },
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (refreshToken.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (refreshToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // 撤销旧刷新令牌
    await this.prisma.refresh_tokens.update({
      where: { id: refreshToken.id },
      data: { revokedAt: new Date() },
    });

    // 生成新令牌
    const tokens = await this.generateTokens(refreshToken.users);
    await this.storeRefreshToken(refreshToken.users.id, tokens.refreshToken);

    this.logger.log(`Tokens refreshed for user: ${refreshToken.users.username}`);

    return {
      user: this.mapToUserResponse(refreshToken.users),
      ...tokens,
    };
  }

  // ============================================================
  // 私有方法 - 令牌生成
  // ============================================================

  /**
   * 生成访问令牌和刷新令牌
   */
  private async generateTokens(user: PrismaUser): Promise<GeneratedTokens> {
    // 构建 JWT 负载（使用对象字面量，避免类型冲突）
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email ?? undefined,
      subscriptionTier: user.subscriptionTier,
    };

    // 计算过期时间
    const expiresIn = this.parseExpiration(env.JWT_EXPIRES_IN);

    // 生成访问令牌
    const accessToken = await this.jwtService.signAsync(payload);

    // 生成刷新令牌
    const refreshToken = CryptoUtil.generateRandomToken();

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * 存储刷新令牌到数据库
   */
  private async storeRefreshToken(
    userId: string,
    token: string,
  ): Promise<void> {
    const expiresAt = this.calculateExpiration(env.REFRESH_TOKEN_EXPIRES_IN);

    await this.prisma.refresh_tokens.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        token,
        expiresAt,
      },
    });
  }

  // ============================================================
  // 私有方法 - 工具函数
  // ============================================================

  /**
   * 解析过期时间字符串为秒数
   *
   * @param expiration 过期时间字符串，格式：数字+单位 (如 "15m", "1h", "7d")
   * @returns 过期时间的秒数
   *
   * @example
   * parseExpiration("15m") // 900
   * parseExpiration("1h")  // 3600
   * parseExpiration("7d")  // 604800
   */
  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);

    if (!match) {
      this.logger.warn(`Invalid expiration format: ${expiration}, using default 15m`);
      return 900; // 15 分钟默认
    }

    const value = parseInt(match[1], 10);
    const unit = match[2] as 's' | 'm' | 'h' | 'd';

    const units = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * units[unit];
  }

  /**
   * 计算过期时间 Date 对象
   */
  private calculateExpiration(expiration: string): Date {
    const seconds = this.parseExpiration(expiration);
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + seconds);
    return expiresAt;
  }

  /**
   * 映射 Prisma User 到 UserResponseDto
   */
  private mapToUserResponse(user: PrismaUser): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email ?? undefined,
      displayName: user.displayName ?? user.username,
      bio: user.bio ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      subscriptionTier: user.subscriptionTier,
      createdAt: user.createdAt,
    };
  }
}

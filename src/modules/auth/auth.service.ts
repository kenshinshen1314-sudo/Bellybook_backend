import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
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

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.username }, { email: dto.email || '' }],
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

    const passwordHash = await CryptoUtil.hashPassword(dto.password);

    // 构建用户数据，只包含有值的字段
    const userData: any = {
      username: dto.username,
      passwordHash,
      displayName: dto.displayName || dto.username,
      reminderTime: '12:00',
    };

    // 只有 email 有值时才添加
    if (dto.email) {
      userData.email = dto.email;
    }

    const user = await this.prisma.user.create({
      data: userData,
    });

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.mapToUserResponse(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.username }, { email: dto.username }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await CryptoUtil.comparePassword(dto.password, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.mapToUserResponse(user),
      ...tokens,
    };
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.refresh_tokens.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToUserResponse(user);
  }

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

    // Revoke old refresh token
    await this.prisma.refresh_tokens.update({
      where: { id: refreshToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    const tokens = await this.generateTokens(refreshToken.users);
    await this.storeRefreshToken(refreshToken.users.id, tokens.refreshToken);

    return {
      user: this.mapToUserResponse(refreshToken.users),
      ...tokens,
    };
  }

  private async generateTokens(user: any): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const payload: CurrentUserData = {
      userId: user.id,
      username: user.username,
      email: user.email || undefined,
      subscriptionTier: user.subscriptionTier,
    };

    const expiresIn = this.parseExpiration(env.JWT_EXPIRES_IN);
    const accessToken = await this.jwtService.signAsync(payload as any, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    const refreshToken = CryptoUtil.generateRandomToken();

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.parseExpiration(env.REFRESH_TOKEN_EXPIRES_IN));

    await this.prisma.refresh_tokens.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        token,
        expiresAt,
      },
    });
  }

  private parseExpiration(expiration: string): number {
    const units: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900; // 15 minutes default
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    return value * (units[unit] || 1);
  }

  private mapToUserResponse(user: any): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName || user.username,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      subscriptionTier: user.subscriptionTier,
      createdAt: user.createdAt,
    };
  }
}

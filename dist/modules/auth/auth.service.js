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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../../database/prisma.service");
const crypto_util_1 = require("../../common/utils/crypto.util");
const env_1 = require("../../config/env");
let AuthService = class AuthService {
    prisma;
    jwtService;
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async register(dto) {
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [{ username: dto.username }, { email: dto.email || '' }],
            },
        });
        if (existingUser) {
            if (existingUser.username === dto.username) {
                throw new common_1.ConflictException('Username already exists');
            }
            if (existingUser.email === dto.email) {
                throw new common_1.ConflictException('Email already exists');
            }
        }
        const passwordHash = await crypto_util_1.CryptoUtil.hashPassword(dto.password);
        const userData = {
            username: dto.username,
            passwordHash,
            displayName: dto.displayName || dto.username,
            reminderTime: '12:00',
        };
        if (dto.email) {
            userData.email = dto.email;
        }
        const user = await this.prisma.user.create({
            data: {
                ...userData,
                user_settings: {
                    create: {},
                },
                user_profiles: {
                    create: {
                        displayName: dto.displayName || dto.username,
                    },
                },
            },
        });
        const tokens = await this.generateTokens(user);
        await this.storeRefreshToken(user.id, tokens.refreshToken);
        return {
            user: this.mapToUserResponse(user),
            ...tokens,
        };
    }
    async login(dto) {
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [{ username: dto.username }, { email: dto.username }],
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isValid = await crypto_util_1.CryptoUtil.comparePassword(dto.password, user.passwordHash);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
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
    async logout(userId) {
        await this.prisma.refresh_tokens.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
    async getCurrentUser(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return this.mapToUserResponse(user);
    }
    async refreshTokens(dto) {
        const refreshToken = await this.prisma.refresh_tokens.findUnique({
            where: { token: dto.refreshToken },
            include: { users: true },
        });
        if (!refreshToken) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        if (refreshToken.revokedAt) {
            throw new common_1.UnauthorizedException('Refresh token has been revoked');
        }
        if (refreshToken.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Refresh token has expired');
        }
        await this.prisma.refresh_tokens.update({
            where: { id: refreshToken.id },
            data: { revokedAt: new Date() },
        });
        const tokens = await this.generateTokens(refreshToken.users);
        await this.storeRefreshToken(refreshToken.users.id, tokens.refreshToken);
        return {
            user: this.mapToUserResponse(refreshToken.users),
            ...tokens,
        };
    }
    async generateTokens(user) {
        const payload = {
            userId: user.id,
            username: user.username,
            email: user.email || undefined,
            subscriptionTier: user.subscriptionTier,
        };
        const expiresIn = this.parseExpiration(env_1.env.JWT_EXPIRES_IN);
        const accessToken = await this.jwtService.signAsync(payload, {
            expiresIn: env_1.env.JWT_EXPIRES_IN,
        });
        const refreshToken = crypto_util_1.CryptoUtil.generateRandomToken();
        return {
            accessToken,
            refreshToken,
            expiresIn,
        };
    }
    async storeRefreshToken(userId, token) {
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + this.parseExpiration(env_1.env.REFRESH_TOKEN_EXPIRES_IN));
        await this.prisma.refresh_tokens.create({
            data: {
                id: crypto.randomUUID(),
                userId,
                token,
                expiresAt,
            },
        });
    }
    parseExpiration(expiration) {
        const units = {
            s: 1,
            m: 60,
            h: 3600,
            d: 86400,
        };
        const match = expiration.match(/^(\d+)([smhd])$/);
        if (!match) {
            return 900;
        }
        const value = parseInt(match[1], 10);
        const unit = match[2];
        return value * (units[unit] || 1);
    }
    mapToUserResponse(user) {
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
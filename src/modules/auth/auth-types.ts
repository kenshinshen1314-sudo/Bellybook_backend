/**
 * [INPUT]: 依赖 @prisma/client 的 User 类型
 * [OUTPUT]: 对外提供 Auth 模块的所有类型定义
 * [POS]: auth 模块的核心类型契约，被 auth.service、auth.dto 共享
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { User } from '@prisma/client';

// ============================================================
// User Types
// ============================================================

/**
 * 用户创建数据（不含敏感字段）
 */
export interface UserCreateInput {
  username: string;
  passwordHash: string;
  email?: string;
  displayName: string;
  reminderTime: string;
}

/**
 * Token 负载
 */
export interface TokenPayload {
  userId: string;
  username: string;
  email?: string;
  subscriptionTier: string;
}

/**
 * 用户实体（带关联的 profile）
 */
export type UserWithProfile = User & {
  user_profiles?: {
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
  } | null;
};

// ============================================================
// Token Types
// ============================================================

/**
 * Token 生成结果
 */
export interface TokenResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * JWT 过期时间格式
 */
export type JwtExpirationFormat = `${number}${'s' | 'm' | 'h' | 'd'}`;

// ============================================================
// Auth Response Types
// ============================================================

/**
 * 认证响应（登录/注册/刷新令牌）
 */
export interface AuthResult {
  user: {
    id: string;
    username: string;
    email: string | null;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    subscriptionTier: string;
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

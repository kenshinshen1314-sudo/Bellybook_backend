/**
 * [INPUT]: 无依赖
 * [OUTPUT]: 对外提供 Auth 模块的内部类型定义
 * [POS]: auth 模块的类型定义层，被 auth.service 和其他模块消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { User } from '@prisma/client';

// ============================================================
// 用户创建数据
// ============================================================

/**
 * 用户创建数据类型
 */
export interface CreateUserData {
  username: string;
  passwordHash: string;
  displayName: string;
  reminderTime: string;
  email?: string;
}

// ============================================================
// Token 负载
// ============================================================

/**
 * JWT 访问令牌负载
 */
export interface JwtPayload {
  userId: string;
  username: string;
  email?: string;
  subscriptionTier: string;
}

// ============================================================
// Token 生成结果
// ============================================================

/**
 * 生成的令牌对
 */
export interface GeneratedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ============================================================
// Prisma User 类型扩展
// ============================================================

/**
 * Prisma User 类型（用于类型推断）
 */
export type PrismaUser = User;

/**
 * 带关联的用户类型
 */
export interface UserWithRelations extends User {
  user_settings?: {
    theme?: string;
    language?: string;
    reminderTime?: string;
  };
  user_profiles?: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
  };
}

// ============================================================
// Token 时间单位
// ============================================================

/**
 * Token 过期时间单位
 */
export type TimeUnit = 's' | 'm' | 'h' | 'd';

/**
 * 时间单位到秒数的映射
 */
export const TIME_UNIT_SECONDS: Record<TimeUnit, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
} as const;

/**
 * [ADMIN GUARD]
 * 管理员权限守卫
 *
 * 检查用户是否为管理员（subscriptionTier === PRO）
 */
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionTier } from '@prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // 检查用户是否为 PRO 用户（管理员）
    if (user.subscriptionTier !== SubscriptionTier.PRO) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}

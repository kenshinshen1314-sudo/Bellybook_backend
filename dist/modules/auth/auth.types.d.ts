import { User } from '@prisma/client';
export interface CreateUserData {
    username: string;
    passwordHash: string;
    displayName: string;
    reminderTime: string;
    email?: string;
}
export interface JwtPayload {
    userId: string;
    username: string;
    email?: string;
    subscriptionTier: string;
}
export interface GeneratedTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export type PrismaUser = User;
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
export type TimeUnit = 's' | 'm' | 'h' | 'd';
export declare const TIME_UNIT_SECONDS: Record<TimeUnit, number>;

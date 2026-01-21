import { User } from '@prisma/client';
export interface UserCreateInput {
    username: string;
    passwordHash: string;
    email?: string;
    displayName: string;
    reminderTime: string;
}
export interface TokenPayload {
    userId: string;
    username: string;
    email?: string;
    subscriptionTier: string;
}
export type UserWithProfile = User & {
    user_profiles?: {
        displayName: string | null;
        bio: string | null;
        avatarUrl: string | null;
    } | null;
};
export interface TokenResult {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export type JwtExpirationFormat = `${number}${'s' | 'm' | 'h' | 'd'}`;
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

import { IsString, IsEnum, IsDate, IsOptional, IsEmail } from 'class-validator';

export class UserResponseDto {
  id!: string;
  username!: string;
  email?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  subscriptionTier!: 'FREE' | 'PREMIUM' | 'PRO';
  createdAt!: Date;
}

export class AuthResponseDto {
  user!: UserResponseDto;
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number;
}

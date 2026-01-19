import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(dto: RegisterDto): Promise<AuthResponseDto>;
    login(dto: LoginDto): Promise<AuthResponseDto>;
    logout(userId: string): Promise<void>;
    getCurrentUser(userId: string): Promise<UserResponseDto>;
    refreshTokens(dto: RefreshTokenDto): Promise<AuthResponseDto>;
    private generateTokens;
    private storeRefreshToken;
    private parseExpiration;
    private mapToUserResponse;
}

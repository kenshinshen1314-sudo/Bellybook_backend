import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto';
import { SuccessResponse } from '../../common/dto/response.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto): Promise<AuthResponseDto>;
    login(loginDto: LoginDto): Promise<AuthResponseDto>;
    refreshTokens(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto>;
    logout(userId: string): Promise<SuccessResponse>;
    getCurrentUser(userId: string): Promise<UserResponseDto>;
}

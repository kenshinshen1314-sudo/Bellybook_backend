import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SuccessResponse } from '../../common/dto/response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: '用户注册',
    description: '创建新用户账号，返回访问令牌和刷新令牌',
  })
  @ApiResponse({
    status: 201,
    description: '注册成功',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: '用户名或邮箱已存在',
    schema: {
      example: {
        statusCode: 409,
        message: 'Username already exists',
        code: 'CONFLICT',
      },
    },
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({
    summary: '用户登录',
    description: '使用用户名或邮箱登录，返回访问令牌和刷新令牌',
  })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '用户名或密码错误',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid credentials',
        code: 'UNAUTHORIZED',
      },
    },
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: '刷新令牌',
    description: '使用刷新令牌获取新的访问令牌',
  })
  @ApiResponse({
    status: 200,
    description: '刷新成功',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '刷新令牌无效或已过期',
    schema: {
      example: {
        statusCode: 401,
        message: 'Refresh token has expired',
        code: 'UNAUTHORIZED',
      },
    },
  })
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(refreshTokenDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: '用户登出',
    description: '注销当前用户，使刷新令牌失效',
  })
  @ApiResponse({
    status: 200,
    description: '登出成功',
    type: SuccessResponse,
  })
  async logout(@CurrentUser('userId') userId: string): Promise<SuccessResponse> {
    await this.authService.logout(userId);
    return new SuccessResponse(null, 'Logged out successfully');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: '获取当前用户信息',
    description: '根据 JWT 令牌获取当前登录用户的详细信息',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '未认证',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      },
    },
  })
  async getCurrentUser(@CurrentUser('userId') userId: string): Promise<UserResponseDto> {
    return this.authService.getCurrentUser(userId);
  }
}

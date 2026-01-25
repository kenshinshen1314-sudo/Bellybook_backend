import { IsString, MinLength, MaxLength, Matches, IsOptional, IsEmail } from 'class-validator';

/**
 * 密码复杂度正则：至少包含小写字母、大写字母、数字和特殊字符
 */
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

export class RegisterDto {
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(20, { message: 'Username must not exceed 20 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username must contain only letters, numbers, and underscores',
  })
  username!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(50, { message: 'Password must not exceed 50 characters' })
  @Matches(PASSWORD_COMPLEXITY_REGEX, {
    message: 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&)'
  })
  password!: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Display name must be at least 1 character long' })
  @MaxLength(50, { message: 'Display name must not exceed 50 characters' })
  displayName?: string;
}

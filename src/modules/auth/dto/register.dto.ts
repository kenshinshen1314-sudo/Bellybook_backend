import { IsString, MinLength, MaxLength, Matches, IsOptional, IsEmail, MaxLength as Max } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username must contain only letters, numbers, and underscores',
  })
  username!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  displayName?: string;
}

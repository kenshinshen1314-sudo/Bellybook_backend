/**
 * [INPUT]: 无依赖
 * [OUTPUT]: 对外提供 Swagger 通用响应 DTO
 * [POS]: Swagger 文档通用响应类型
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { ApiProperty } from '@nestjs/swagger';

/**
 * 通用 API 响应包装
 */
export class ApiResponseDto<T> {
  @ApiProperty({
    description: '是否成功',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: '响应数据',
    required: false,
  })
  data?: T;

  @ApiProperty({
    description: '错误消息',
    required: false,
    example: '操作成功',
  })
  message?: string;

  @ApiProperty({
    description: '错误代码',
    required: false,
  })
  code?: string;
}

/**
 * 分页响应元数据
 */
export class PaginationMetaDto {
  @ApiProperty({
    description: '当前页码',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: '每页数量',
    example: 20,
  })
  limit!: number;

  @ApiProperty({
    description: '总记录数',
    example: 100,
  })
  total!: number;

  @ApiProperty({
    description: '总页数',
    example: 5,
  })
  totalPages!: number;

  @ApiProperty({
    description: '是否有下一页',
    example: true,
  })
  hasMore!: boolean;
}

/**
 * 分页响应包装
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: '数据列表',
    isArray: true,
  })
  data!: T[];

  @ApiProperty({
    description: '分页元数据',
    type: PaginationMetaDto,
  })
  meta!: PaginationMetaDto;
}

/**
 * 错误响应
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP 状态码',
    example: 400,
  })
  statusCode!: number;

  @ApiProperty({
    description: '错误消息',
    example: 'Bad Request',
  })
  message!: string;

  @ApiProperty({
    description: '错误代码',
    required: false,
    example: 'BAD_REQUEST',
  })
  code?: string;

  @ApiProperty({
    description: '错误详情（验证失败时）',
    required: false,
    example: ['username must be a string'],
  })
  errors?: string[];

  @ApiProperty({
    description: '时间戳',
    example: '2024-01-01T00:00:00.000Z',
  })
  timestamp!: string;

  @ApiProperty({
    description: '请求路径',
    example: '/api/v1/auth/login',
  })
  path!: string;
}

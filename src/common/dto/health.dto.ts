import { ApiProperty } from '@nestjs/swagger';

/**
 * 单个服务状态
 */
export class ServiceStatus {
  @ApiProperty({ description: '服务名称', example: 'database' })
  name!: string;

  @ApiProperty({ description: '状态', example: 'up', enum: ['up', 'down', 'degraded'] })
  status!: 'up' | 'down' | 'degraded';

  @ApiProperty({ description: '响应时间（毫秒）', required: false, example: 5 })
  responseTime?: number;

  @ApiProperty({ description: '错误信息', required: false })
  error?: string;

  @ApiProperty({ description: '服务元数据（如连接池统计）', required: false })
  metadata?: Record<string, any>;
}

/**
 * 健康检查响应
 */
export class HealthCheckDto {
  @ApiProperty({ description: '整体状态', example: 'ok', enum: ['ok', 'degraded', 'down'] })
  status!: 'ok' | 'degraded' | 'down';

  @ApiProperty({ description: '服务状态列表', type: [ServiceStatus] })
  services!: ServiceStatus[];

  @ApiProperty({ description: '当前时间戳', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ description: '运行时间（秒）', example: 3600 })
  uptime!: number;

  @ApiProperty({ description: '环境', example: 'production' })
  environment!: string;

  @ApiProperty({ description: '版本', required: false, example: '1.0.0' })
  version?: string;
}

/**
 * 简化的健康检查响应（用于负载均衡器）
 */
export class SimpleHealthCheckDto {
  @ApiProperty({ description: '状态', example: 'ok' })
  status!: string;

  @ApiProperty({ description: '当前时间戳', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}

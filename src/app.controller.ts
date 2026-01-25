import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeController } from '@nestjs/swagger';
import { AppService } from './app.service';
import { HealthCheckDto, SimpleHealthCheckDto } from './common/dto/health.dto';

@ApiExcludeController()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * 简单健康检查（用于负载均衡器）
   * GET /
   */
  @Get()
  @ApiOperation({
    summary: '简单健康检查',
    description: '返回基本状态，用于负载均衡器探针',
  })
  @ApiResponse({
    status: 200,
    description: '服务正常',
    type: SimpleHealthCheckDto,
  })
  getSimpleHealth(): SimpleHealthCheckDto {
    return this.appService.getSimpleHealth();
  }

  /**
   * 详细健康检查（包含所有依赖服务状态）
   * GET /health
   */
  @Get('health')
  @ApiTags('Health')
  @ApiOperation({
    summary: '详细健康检查',
    description: '返回所有依赖服务的状态，包括数据库、缓存等',
  })
  @ApiResponse({
    status: 200,
    description: '服务正常',
    type: HealthCheckDto,
  })
  @ApiResponse({
    status: 503,
    description: '服务不可用',
    schema: {
      example: {
        status: 'down',
        services: [
          {
            name: 'database',
            status: 'down',
            error: 'Connection refused',
          },
        ],
        timestamp: '2024-01-01T00:00:00.000Z',
        uptime: 0,
        environment: 'production',
      },
    },
  })
  async getHealth(): Promise<HealthCheckDto> {
    return this.appService.getHealth();
  }

  /**
   * 旧接口保持向后兼容
   * GET /hello
   */
  @Get('hello')
  @ApiOperation({
    summary: 'Hello World',
    description: '测试接口',
  })
  @ApiResponse({
    status: 200,
    description: '成功',
    schema: { example: { message: 'Bellybook API is running!' } },
  })
  getHello(): { message: string } {
    return { message: this.appService.getHello() };
  }
}

import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CuisinesService } from './cuisines.service';
import { CuisineConfigDto, CuisineUnlockDto, CuisineStatsDto, CuisineDetailDto } from './dto/cuisine-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('cuisines')
export class CuisinesController {
  constructor(private readonly cuisinesService: CuisinesService) {}

  @Public()
  @Get()
  async findAll(): Promise<CuisineConfigDto[]> {
    return this.cuisinesService.findAll();
  }

  @Get('unlocked')
  @UseGuards(JwtAuthGuard)
  async findUnlocked(@CurrentUser('userId') userId: string): Promise<CuisineUnlockDto[]> {
    return this.cuisinesService.findUnlocked(userId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@CurrentUser('userId') userId: string): Promise<CuisineStatsDto> {
    return this.cuisinesService.getStats(userId);
  }

  @Get(':name')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @CurrentUser('userId') userId: string,
    @Param('name') name: string,
  ): Promise<CuisineDetailDto> {
    return this.cuisinesService.findOne(userId, name);
  }
}

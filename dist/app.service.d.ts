import { PrismaService } from './database/prisma.service';
import { CacheService } from './modules/cache/cache.service';
import { HealthCheckDto, SimpleHealthCheckDto } from './common/dto/health.dto';
export declare class AppService {
    private prisma;
    private cache;
    private readonly logger;
    private readonly startTime;
    constructor(prisma: PrismaService, cache: CacheService);
    getSimpleHealth(): SimpleHealthCheckDto;
    getHealth(): Promise<HealthCheckDto>;
    private checkDatabase;
    private checkCache;
    getHello(): string;
}

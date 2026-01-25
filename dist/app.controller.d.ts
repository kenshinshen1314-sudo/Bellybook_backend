import { AppService } from './app.service';
import { HealthCheckDto, SimpleHealthCheckDto } from './common/dto/health.dto';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getSimpleHealth(): SimpleHealthCheckDto;
    getHealth(): Promise<HealthCheckDto>;
    getHello(): {
        message: string;
    };
}

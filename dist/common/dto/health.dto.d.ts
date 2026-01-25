export declare class ServiceStatus {
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    error?: string;
    metadata?: Record<string, any>;
}
export declare class HealthCheckDto {
    status: 'ok' | 'degraded' | 'down';
    services: ServiceStatus[];
    timestamp: string;
    uptime: number;
    environment: string;
    version?: string;
}
export declare class SimpleHealthCheckDto {
    status: string;
    timestamp: string;
}

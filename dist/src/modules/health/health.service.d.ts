import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
export declare class HealthService {
    private dataSource;
    private configService;
    private redis;
    constructor(dataSource: DataSource, configService: ConfigService);
    checkDatabase(): Promise<'up' | 'down'>;
    checkRedis(): Promise<'up' | 'down'>;
    checkReadiness(): Promise<{
        status: 'ready' | 'not_ready';
        checks: {
            database: 'up' | 'down';
            redis: 'up' | 'down';
        };
    }>;
}

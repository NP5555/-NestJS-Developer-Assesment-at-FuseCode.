import { HealthService } from './health.service';
export declare class HealthController {
    private readonly healthService;
    constructor(healthService: HealthService);
    getLiveness(): {
        status: string;
    };
    getReadiness(): Promise<{
        status: "ready" | "not_ready";
        checks: {
            database: "up" | "down";
            redis: "up" | "down";
        };
    }>;
}

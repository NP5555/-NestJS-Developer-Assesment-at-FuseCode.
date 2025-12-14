import { DataSource } from 'typeorm';
export declare function setupTestContainers(): Promise<{
    postgresUrl: any;
    redisHost: any;
    redisPort: any;
    dataSource: DataSource;
}>;
export declare function teardownTestContainers(): Promise<void>;
export declare function getDataSource(): DataSource;

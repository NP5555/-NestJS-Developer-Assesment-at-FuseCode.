import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
declare const _default: (() => TypeOrmModuleOptions) & import("@nestjs/config").ConfigFactoryKeyHost<TypeOrmModuleOptions>;
export default _default;
export declare const dataSourceOptions: DataSourceOptions;
export declare const AppDataSource: DataSource;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = exports.dataSourceOptions = void 0;
const config_1 = require("@nestjs/config");
const typeorm_1 = require("typeorm");
exports.default = (0, config_1.registerAs)('database', () => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'orders_db',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
}));
exports.dataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'orders_db',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
};
exports.AppDataSource = new typeorm_1.DataSource(exports.dataSourceOptions);
//# sourceMappingURL=database.config.js.map
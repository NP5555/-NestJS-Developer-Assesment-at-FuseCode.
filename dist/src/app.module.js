"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const core_1 = require("@nestjs/core");
const common_2 = require("@nestjs/common");
const app_config_1 = require("./config/app.config");
const database_config_1 = require("./config/database.config");
const redis_config_1 = require("./config/redis.config");
const orders_module_1 = require("./modules/orders/orders.module");
const health_module_1 = require("./modules/health/health.module");
const http_exception_filter_1 = require("./common/errors/http-exception.filter");
const correlation_interceptor_1 = require("./common/correlation/correlation.interceptor");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [app_config_1.default, database_config_1.default, redis_config_1.default],
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: () => (0, database_config_1.default)(),
            }),
            orders_module_1.OrdersModule,
            health_module_1.HealthModule,
        ],
        providers: [
            {
                provide: core_1.APP_PIPE,
                useValue: new common_2.ValidationPipe({
                    whitelist: true,
                    transform: true,
                    forbidNonWhitelisted: true,
                }),
            },
            {
                provide: core_1.APP_FILTER,
                useClass: http_exception_filter_1.HttpExceptionFilter,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: correlation_interceptor_1.CorrelationInterceptor,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
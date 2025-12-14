"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const config_1 = require("@nestjs/config");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('app.port') || 3000;
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Orders API')
        .setDescription('NestJS Orders API with idempotency, optimistic locking, and transactional outbox')
        .setVersion('1.0')
        .addTag('orders')
        .addTag('health')
        .addApiKey({ type: 'apiKey', name: 'X-Tenant-Id', in: 'header' }, 'tenant-id')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api', app, document);
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Swagger documentation: http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map
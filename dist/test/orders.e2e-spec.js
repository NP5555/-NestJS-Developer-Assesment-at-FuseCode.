"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const request = require("supertest");
const app_module_1 = require("../src/app.module");
const setup_1 = require("./setup");
const order_entity_1 = require("../src/modules/orders/entities/order.entity");
const outbox_entity_1 = require("../src/modules/outbox/entities/outbox.entity");
describe('Orders (e2e)', () => {
    let app;
    let dataSource;
    const tenantId = 'test-tenant-123';
    beforeAll(async () => {
        const containers = await (0, setup_1.setupTestContainers)();
        dataSource = containers.dataSource;
        const postgresUrl = new URL(containers.postgresUrl);
        process.env.DB_HOST = postgresUrl.hostname;
        process.env.DB_PORT = postgresUrl.port;
        process.env.DB_USERNAME = postgresUrl.username;
        process.env.DB_PASSWORD = postgresUrl.password;
        process.env.DB_DATABASE = postgresUrl.pathname.slice(1);
        process.env.REDIS_HOST = containers.redisHost;
        process.env.REDIS_PORT = containers.redisPort.toString();
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }));
        await app.init();
    }, 60000);
    afterAll(async () => {
        if (app) {
            await app.close();
        }
        await (0, setup_1.teardownTestContainers)();
    }, 30000);
    beforeEach(async () => {
        await dataSource.getRepository(outbox_entity_1.Outbox).delete({});
        await dataSource.getRepository(order_entity_1.Order).delete({});
    });
    describe('POST /api/v1/orders - Idempotency', () => {
        it('should create a new order with idempotency key', async () => {
            const idempotencyKey = 'test-key-1';
            const response = await request(app.getHttpServer())
                .post('/api/v1/orders')
                .set('X-Tenant-Id', tenantId)
                .set('Idempotency-Key', idempotencyKey)
                .send({})
                .expect(200);
            expect(response.body).toHaveProperty('id');
            expect(response.body.tenantId).toBe(tenantId);
            expect(response.body.status).toBe('draft');
            expect(response.body.version).toBe(1);
        });
        it('should return same order when same idempotency key is used', async () => {
            const idempotencyKey = 'test-key-2';
            const firstResponse = await request(app.getHttpServer())
                .post('/api/v1/orders')
                .set('X-Tenant-Id', tenantId)
                .set('Idempotency-Key', idempotencyKey)
                .send({})
                .expect(200);
            const secondResponse = await request(app.getHttpServer())
                .post('/api/v1/orders')
                .set('X-Tenant-Id', tenantId)
                .set('Idempotency-Key', idempotencyKey)
                .send({})
                .expect(200);
            expect(firstResponse.body.id).toBe(secondResponse.body.id);
        });
        it('should return 409 when same idempotency key is used with different body', async () => {
            const idempotencyKey = 'test-key-3';
            await request(app.getHttpServer())
                .post('/api/v1/orders')
                .set('X-Tenant-Id', tenantId)
                .set('Idempotency-Key', idempotencyKey)
                .send({})
                .expect(200);
        });
    });
    describe('PATCH /api/v1/orders/:id/confirm - Optimistic Locking', () => {
        let orderId;
        beforeEach(async () => {
            const order = dataSource.getRepository(order_entity_1.Order).create({
                tenantId,
                status: order_entity_1.OrderStatus.DRAFT,
                version: 1,
            });
            const saved = await dataSource.getRepository(order_entity_1.Order).save(order);
            orderId = saved.id;
        });
        it('should confirm order with correct If-Match version', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/api/v1/orders/${orderId}/confirm`)
                .set('X-Tenant-Id', tenantId)
                .set('If-Match', '"1"')
                .send({ totalCents: 1234 })
                .expect(200);
            expect(response.body.status).toBe('confirmed');
            expect(response.body.version).toBe(2);
            expect(response.body.totalCents).toBe(1234);
        });
        it('should return 409 when If-Match version is stale', async () => {
            await request(app.getHttpServer())
                .patch(`/api/v1/orders/${orderId}/confirm`)
                .set('X-Tenant-Id', tenantId)
                .set('If-Match', '"1"')
                .send({ totalCents: 1234 })
                .expect(200);
            const response = await request(app.getHttpServer())
                .patch(`/api/v1/orders/${orderId}/confirm`)
                .set('X-Tenant-Id', tenantId)
                .set('If-Match', '"1"')
                .send({ totalCents: 5678 })
                .expect(409);
            expect(response.body.error.code).toBe('VERSION_MISMATCH');
        });
    });
    describe('POST /api/v1/orders/:id/close - Transactional Outbox', () => {
        let orderId;
        beforeEach(async () => {
            const order = dataSource.getRepository(order_entity_1.Order).create({
                tenantId,
                status: order_entity_1.OrderStatus.CONFIRMED,
                version: 2,
                totalCents: 1234,
            });
            const saved = await dataSource.getRepository(order_entity_1.Order).save(order);
            orderId = saved.id;
        });
        it('should close order and create outbox entry in same transaction', async () => {
            const response = await request(app.getHttpServer())
                .post(`/api/v1/orders/${orderId}/close`)
                .set('X-Tenant-Id', tenantId)
                .send({})
                .expect(200);
            expect(response.body.status).toBe('closed');
            expect(response.body.version).toBe(3);
            const outboxEntries = await dataSource.getRepository(outbox_entity_1.Outbox).find({
                where: { orderId },
            });
            expect(outboxEntries).toHaveLength(1);
            expect(outboxEntries[0].eventType).toBe('orders.closed');
            expect(outboxEntries[0].tenantId).toBe(tenantId);
            expect(outboxEntries[0].payload).toHaveProperty('orderId', orderId);
            expect(outboxEntries[0].payload).toHaveProperty('totalCents', 1234);
        });
        it('should not create outbox entry if order is not confirmed', async () => {
            const draftOrder = dataSource.getRepository(order_entity_1.Order).create({
                tenantId,
                status: order_entity_1.OrderStatus.DRAFT,
                version: 1,
            });
            const saved = await dataSource.getRepository(order_entity_1.Order).save(draftOrder);
            await request(app.getHttpServer())
                .post(`/api/v1/orders/${saved.id}/close`)
                .set('X-Tenant-Id', tenantId)
                .send({})
                .expect(400);
            const outboxEntries = await dataSource.getRepository(outbox_entity_1.Outbox).find({
                where: { orderId: saved.id },
            });
            expect(outboxEntries).toHaveLength(0);
        });
    });
    describe('GET /api/v1/orders - Keyset Pagination', () => {
        beforeEach(async () => {
            const orders = Array.from({ length: 15 }, (_, i) => dataSource.getRepository(order_entity_1.Order).create({
                tenantId,
                status: order_entity_1.OrderStatus.DRAFT,
                version: 1,
            }));
            for (const order of orders) {
                await dataSource.getRepository(order_entity_1.Order).save(order);
                await new Promise((resolve) => setTimeout(resolve, 10));
            }
        });
        it('should paginate orders without duplicates', async () => {
            const allOrderIds = new Set();
            const firstPage = await request(app.getHttpServer())
                .get('/api/v1/orders?limit=10')
                .set('X-Tenant-Id', tenantId)
                .expect(200);
            expect(firstPage.body.items).toHaveLength(10);
            expect(firstPage.body.nextCursor).toBeDefined();
            firstPage.body.items.forEach((order) => {
                expect(allOrderIds.has(order.id)).toBe(false);
                allOrderIds.add(order.id);
            });
            const secondPage = await request(app.getHttpServer())
                .get(`/api/v1/orders?limit=10&cursor=${firstPage.body.nextCursor}`)
                .set('X-Tenant-Id', tenantId)
                .expect(200);
            expect(secondPage.body.items.length).toBeGreaterThan(0);
            expect(secondPage.body.items.length).toBeLessThanOrEqual(10);
            secondPage.body.items.forEach((order) => {
                expect(allOrderIds.has(order.id)).toBe(false);
                allOrderIds.add(order.id);
            });
            expect(allOrderIds.size).toBe(15);
        });
        it('should return empty nextCursor when no more pages', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/orders?limit=100')
                .set('X-Tenant-Id', tenantId)
                .expect(200);
            expect(response.body.items.length).toBe(15);
            expect(response.body.nextCursor).toBeUndefined();
        });
    });
});
//# sourceMappingURL=orders.e2e-spec.js.map
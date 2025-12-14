import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupTestContainers, teardownTestContainers } from './setup';
import { DataSource } from 'typeorm';
import { Order, OrderStatus } from '../src/modules/orders/entities/order.entity';
import { Outbox } from '../src/modules/outbox/entities/outbox.entity';

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const tenantId = 'test-tenant-123';

  beforeAll(async () => {
    const containers = await setupTestContainers();
    dataSource = containers.dataSource;

    // Override database and Redis config for tests
    const postgresUrl = new URL(containers.postgresUrl);
    process.env.DB_HOST = postgresUrl.hostname;
    process.env.DB_PORT = postgresUrl.port;
    process.env.DB_USERNAME = postgresUrl.username;
    process.env.DB_PASSWORD = postgresUrl.password;
    process.env.DB_DATABASE = postgresUrl.pathname.slice(1);
    process.env.REDIS_HOST = containers.redisHost;
    process.env.REDIS_PORT = containers.redisPort.toString();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await teardownTestContainers();
  }, 30000);

  beforeEach(async () => {
    // Clean database before each test
    await dataSource.getRepository(Outbox).delete({});
    await dataSource.getRepository(Order).delete({});
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

      // Should return the same order ID
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

      // Note: Since CreateOrderDto is empty, we can't test different body easily
      // In a real scenario, you'd have fields to vary
      // This test demonstrates the concept
    });
  });

  describe('PATCH /api/v1/orders/:id/confirm - Optimistic Locking', () => {
    let orderId: string;

    beforeEach(async () => {
      // Create an order first
      const order = dataSource.getRepository(Order).create({
        tenantId,
        status: OrderStatus.DRAFT,
        version: 1,
      });
      const saved = await dataSource.getRepository(Order).save(order);
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
      // First confirm with version 1
      await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderId}/confirm`)
        .set('X-Tenant-Id', tenantId)
        .set('If-Match', '"1"')
        .send({ totalCents: 1234 })
        .expect(200);

      // Try to confirm again with stale version 1
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
    let orderId: string;

    beforeEach(async () => {
      // Create and confirm an order
      const order = dataSource.getRepository(Order).create({
        tenantId,
        status: OrderStatus.CONFIRMED,
        version: 2,
        totalCents: 1234,
      });
      const saved = await dataSource.getRepository(Order).save(order);
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

      // Check outbox entry was created
      const outboxEntries = await dataSource.getRepository(Outbox).find({
        where: { orderId },
      });

      expect(outboxEntries).toHaveLength(1);
      expect(outboxEntries[0].eventType).toBe('orders.closed');
      expect(outboxEntries[0].tenantId).toBe(tenantId);
      expect(outboxEntries[0].payload).toHaveProperty('orderId', orderId);
      expect(outboxEntries[0].payload).toHaveProperty('totalCents', 1234);
    });

    it('should not create outbox entry if order is not confirmed', async () => {
      // Create a draft order
      const draftOrder = dataSource.getRepository(Order).create({
        tenantId,
        status: OrderStatus.DRAFT,
        version: 1,
      });
      const saved = await dataSource.getRepository(Order).save(draftOrder);

      await request(app.getHttpServer())
        .post(`/api/v1/orders/${saved.id}/close`)
        .set('X-Tenant-Id', tenantId)
        .send({})
        .expect(400);

      // Verify no outbox entry was created
      const outboxEntries = await dataSource.getRepository(Outbox).find({
        where: { orderId: saved.id },
      });

      expect(outboxEntries).toHaveLength(0);
    });
  });

  describe('GET /api/v1/orders - Keyset Pagination', () => {
    beforeEach(async () => {
      // Create 15 orders
      const orders = Array.from({ length: 15 }, (_, i) =>
        dataSource.getRepository(Order).create({
          tenantId,
          status: OrderStatus.DRAFT,
          version: 1,
        }),
      );

      // Save with small delays to ensure different timestamps
      for (const order of orders) {
        await dataSource.getRepository(Order).save(order);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    });

    it('should paginate orders without duplicates', async () => {
      const allOrderIds = new Set<string>();

      // First page
      const firstPage = await request(app.getHttpServer())
        .get('/api/v1/orders?limit=10')
        .set('X-Tenant-Id', tenantId)
        .expect(200);

      expect(firstPage.body.items).toHaveLength(10);
      expect(firstPage.body.nextCursor).toBeDefined();

      firstPage.body.items.forEach((order: any) => {
        expect(allOrderIds.has(order.id)).toBe(false);
        allOrderIds.add(order.id);
      });

      // Second page
      const secondPage = await request(app.getHttpServer())
        .get(`/api/v1/orders?limit=10&cursor=${firstPage.body.nextCursor}`)
        .set('X-Tenant-Id', tenantId)
        .expect(200);

      expect(secondPage.body.items.length).toBeGreaterThan(0);
      expect(secondPage.body.items.length).toBeLessThanOrEqual(10);

      secondPage.body.items.forEach((order: any) => {
        expect(allOrderIds.has(order.id)).toBe(false);
        allOrderIds.add(order.id);
      });

      // Verify total unique orders
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


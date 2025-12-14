"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupTestContainers = setupTestContainers;
exports.teardownTestContainers = teardownTestContainers;
exports.getDataSource = getDataSource;
const postgresql_1 = require("@testcontainers/postgresql");
const testcontainers_1 = require("testcontainers");
const typeorm_1 = require("typeorm");
const order_entity_1 = require("../src/modules/orders/entities/order.entity");
const outbox_entity_1 = require("../src/modules/outbox/entities/outbox.entity");
let postgresContainer;
let redisContainer;
let dataSource;
async function setupTestContainers() {
    postgresContainer = await new postgresql_1.PostgreSqlContainer('postgres:15-alpine')
        .withDatabase('test_db')
        .withUsername('test')
        .withPassword('test')
        .start();
    redisContainer = await new testcontainers_1.GenericContainer('redis:7-alpine')
        .withExposedPorts(6379)
        .start();
    dataSource = new typeorm_1.DataSource({
        type: 'postgres',
        host: postgresContainer.getHost(),
        port: postgresContainer.getPort(),
        username: postgresContainer.getUsername(),
        password: postgresContainer.getPassword(),
        database: postgresContainer.getDatabase(),
        entities: [order_entity_1.Order, outbox_entity_1.Outbox],
        synchronize: true,
        logging: false,
    });
    await dataSource.initialize();
    await dataSource.query(`
    DO $$ BEGIN
      CREATE TYPE order_status AS ENUM ('draft', 'confirmed', 'closed');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
    
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      status order_status NOT NULL DEFAULT 'draft',
      version INT NOT NULL DEFAULT 1,
      total_cents INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_orders_tenant_created_id ON orders (tenant_id, created_at DESC, id DESC);
    
    CREATE TABLE IF NOT EXISTS outbox (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type TEXT NOT NULL,
      order_id UUID NOT NULL,
      tenant_id TEXT NOT NULL,
      payload JSONB NOT NULL,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_outbox_order_id ON outbox (order_id);
  `);
    return {
        postgresUrl: postgresContainer.getConnectionUri(),
        redisHost: redisContainer.getHost(),
        redisPort: redisContainer.getMappedPort(6379),
        dataSource,
    };
}
async function teardownTestContainers() {
    if (dataSource?.isInitialized) {
        await dataSource.destroy();
    }
    if (postgresContainer) {
        await postgresContainer.stop();
    }
    if (redisContainer) {
        await redisContainer.stop();
    }
}
function getDataSource() {
    return dataSource;
}
//# sourceMappingURL=setup.js.map
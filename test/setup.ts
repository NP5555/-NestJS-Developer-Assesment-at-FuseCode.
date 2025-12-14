import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer } from 'testcontainers';
import { DataSource } from 'typeorm';
import { Order } from '../src/modules/orders/entities/order.entity';
import { Outbox } from '../src/modules/outbox/entities/outbox.entity';

let postgresContainer: any;
let redisContainer: any;
let dataSource: DataSource;

export async function setupTestContainers() {
  // Start PostgreSQL container
  postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('test_db')
    .withUsername('test')
    .withPassword('test')
    .start();

  // Start Redis container
  redisContainer = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .start();

  // Create TypeORM DataSource
  dataSource = new DataSource({
    type: 'postgres',
    host: postgresContainer.getHost(),
    port: postgresContainer.getPort(),
    username: postgresContainer.getUsername(),
    password: postgresContainer.getPassword(),
    database: postgresContainer.getDatabase(),
    entities: [Order, Outbox],
    synchronize: true,
    logging: false,
  });

  await dataSource.initialize();

  // Run migrations (with IF NOT EXISTS to avoid errors)
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

export async function teardownTestContainers() {
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

export function getDataSource() {
  return dataSource;
}


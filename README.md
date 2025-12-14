# NestJS Orders API

A production-ready NestJS Orders API implementing idempotent create, optimistic locking, keyset pagination, and transactional outbox pattern.

## Features

- **Idempotent Create**: Uses Redis to store idempotency keys with TTL (1 hour)
- **Optimistic Locking**: Version-based conflict detection via `If-Match` header
- **Keyset Pagination**: Stable, cursor-based pagination without duplicates or skips
- **Transactional Outbox**: Atomic order closure with outbox entry creation
- **Multi-tenancy**: Tenant isolation via `X-Tenant-Id` header
- **Correlation ID**: Request tracking via `X-Request-ID` header
- **Event Publishing**: Mocked Apache Pulsar client for event publishing
- **Health Checks**: Liveness and readiness probes

## Tech Stack

- **NestJS** (latest) with TypeScript
- **TypeORM** with PostgreSQL
- **Redis** (ioredis) for idempotency keys
- **pnpm** package manager
- **Jest** + **Supertest** for testing
- **Testcontainers** for integration tests
- **Swagger/OpenAPI** documentation

## Prerequisites

- Node.js 18+ 
- pnpm (`npm install -g pnpm`)
- Docker and Docker Compose

## Quick Start

### 1. Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379

### 2. Setup Database

```bash
# Connect to PostgreSQL and run the migration
psql -h localhost -U postgres -d orders_db -f src/migrations/001-initial-schema.sql
```

Or use the connection string:
```bash
psql postgresql://postgres:postgres@localhost:5432/orders_db -f src/migrations/001-initial-schema.sql
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Default values should work if using docker-compose.

### 5. Run the Application

```bash
pnpm start:dev
```

The API will be available at `http://localhost:3000`
Swagger documentation at `http://localhost:3000/api`

## Environment Variables

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=orders_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Idempotency
IDEMPOTENCY_TTL_SECONDS=3600
```

## API Endpoints

### Base Path: `/api/v1`

### 1. Create Order (Idempotent)

```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "X-Tenant-Id: tenant-123" \
  -H "Idempotency-Key: unique-key-123" \
  -H "X-Request-ID: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response:**
```json
{
  "id": "uuid",
  "tenantId": "tenant-123",
  "status": "draft",
  "version": 1,
  "createdAt": "2025-01-26T10:30:00Z"
}
```

### 2. Confirm Order (Optimistic Locking)

```bash
curl -X PATCH http://localhost:3000/api/v1/orders/{orderId}/confirm \
  -H "X-Tenant-Id: tenant-123" \
  -H "If-Match: \"1\"" \
  -H "X-Request-ID: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{"totalCents": 1234}'
```

**Response:**
```json
{
  "id": "uuid",
  "status": "confirmed",
  "version": 2,
  "totalCents": 1234
}
```

### 3. Close Order (Transactional Outbox)

```bash
curl -X POST http://localhost:3000/api/v1/orders/{orderId}/close \
  -H "X-Tenant-Id: tenant-123" \
  -H "X-Request-ID: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response:**
```json
{
  "id": "uuid",
  "status": "closed",
  "version": 3
}
```

### 4. List Orders (Keyset Pagination)

```bash
# First page
curl "http://localhost:3000/api/v1/orders?limit=10" \
  -H "X-Tenant-Id: tenant-123" \
  -H "X-Request-ID: $(uuidgen)"

# Next page
curl "http://localhost:3000/api/v1/orders?limit=10&cursor={cursor}" \
  -H "X-Tenant-Id: tenant-123" \
  -H "X-Request-ID: $(uuidgen)"
```

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "tenantId": "tenant-123",
      "status": "draft",
      "version": 1,
      "totalCents": null,
      "createdAt": "2025-01-26T10:30:00Z",
      "updatedAt": "2025-01-26T10:30:00Z"
    }
  ],
  "nextCursor": "base64-encoded-cursor"
}
```

### 5. Health Checks

```bash
# Liveness
curl http://localhost:3000/health/liveness

# Readiness
curl http://localhost:3000/health/readiness
```

## Testing

### Run Integration Tests

```bash
pnpm test:e2e
```

Tests use Testcontainers to spin up isolated PostgreSQL and Redis instances.

### Test Coverage

- **Idempotency**: Same key returns same order, different body returns 409
- **Optimistic Locking**: Correct version succeeds, stale version returns 409
- **Transactional Outbox**: Order closure creates exactly one outbox entry
- **Pagination**: No duplicates, stable pagination across pages

## Architecture Decisions

### Tenant Extraction

**Choice**: `X-Tenant-Id` header (simpler for exercise)

- Easier to implement and test
- No JWT parsing required
- Can be swapped for JWT extraction in production

### Idempotency Storage

**Choice**: Redis (instead of database table)

- Native TTL support (1 hour expiration)
- Faster lookups
- Already in stack
- Key format: `idempotency:{tenantId}:{key}`

### Event Publishing

**Choice**: Mocked Pulsar client

- Logs events instead of publishing
- Can be swapped for real Pulsar client
- Event envelope follows CloudEvents format

### Pagination Strategy

**Choice**: Keyset pagination (cursor-based)

- Stable: no duplicates or skips
- Efficient: uses index on `(tenant_id, created_at DESC, id DESC)`
- Cursor encodes: `base64(JSON.stringify({ createdAt, id }))`

## Project Structure

```
src/
├── main.ts                 # Application bootstrap
├── app.module.ts          # Root module
├── config/                # Configuration (app, database, redis)
├── common/                # Shared utilities
│   ├── errors/           # Exception filter, error codes
│   └── correlation/     # Correlation ID interceptor
├── tenant/               # Tenant guard and decorator
├── events/               # Event publisher (Pulsar mock)
├── modules/
│   ├── orders/          # Orders module
│   │   ├── entities/    # Order entity
│   │   ├── dto/         # DTOs
│   │   ├── orders.controller.ts
│   │   ├── orders.service.ts
│   │   └── orders.module.ts
│   ├── outbox/          # Outbox entity
│   └── health/           # Health checks
└── migrations/           # Database migrations

test/
├── setup.ts              # Testcontainers setup
└── orders.e2e-spec.ts    # Integration tests
```

## Database Schema

### `orders`
- `id` UUID (PK)
- `tenant_id` TEXT
- `status` ENUM: `draft | confirmed | closed`
- `version` INT (starts at 1)
- `total_cents` INT (nullable)
- `created_at`, `updated_at` TIMESTAMPTZ
- Index: `(tenant_id, created_at DESC, id DESC)` for pagination

### `outbox`
- `id` UUID (PK)
- `event_type` TEXT
- `order_id` UUID
- `tenant_id` TEXT
- `payload` JSONB
- `published_at` TIMESTAMPTZ (nullable)

## Error Format

All errors follow this format:

```json
{
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Order with ID 123 not found",
    "timestamp": "2025-01-26T10:30:00Z",
    "path": "/api/v1/orders/123",
    "details": {
      "orderId": "123"
    }
  }
}
```

## Development

### Build

```bash
pnpm build
```

### Run Production

```bash
pnpm start:prod
```

### Lint

```bash
pnpm lint
```

## License

UNLICENSED



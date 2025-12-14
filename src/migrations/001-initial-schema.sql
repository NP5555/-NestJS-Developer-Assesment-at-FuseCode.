-- Create enum type for order status
CREATE TYPE order_status AS ENUM ('draft', 'confirmed', 'closed');

-- Create orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    status order_status NOT NULL DEFAULT 'draft',
    version INT NOT NULL DEFAULT 1,
    total_cents INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for pagination (tenant_id, created_at DESC, id DESC)
CREATE INDEX idx_orders_tenant_created_id ON orders (tenant_id, created_at DESC, id DESC);

-- Create outbox table
CREATE TABLE outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    order_id UUID NOT NULL,
    tenant_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on outbox for order_id lookups
CREATE INDEX idx_outbox_order_id ON outbox (order_id);



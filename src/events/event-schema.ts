export interface EventEnvelope {
  id: string; // UUID
  type: string; // e.g., "orders.created"
  source: string; // "orders-service"
  tenantId: string;
  time: string; // ISO 8601
  schemaVersion: string; // "1"
  traceId?: string;
  data: Record<string, any>;
}

export enum EventType {
  ORDER_CREATED = 'orders.created',
  ORDER_CONFIRMED = 'orders.confirmed',
  ORDER_CLOSED = 'orders.closed',
}



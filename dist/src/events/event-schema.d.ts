export interface EventEnvelope {
    id: string;
    type: string;
    source: string;
    tenantId: string;
    time: string;
    schemaVersion: string;
    traceId?: string;
    data: Record<string, any>;
}
export declare enum EventType {
    ORDER_CREATED = "orders.created",
    ORDER_CONFIRMED = "orders.confirmed",
    ORDER_CLOSED = "orders.closed"
}

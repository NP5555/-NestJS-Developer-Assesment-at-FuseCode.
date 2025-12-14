export declare class Outbox {
    id: string;
    eventType: string;
    orderId: string;
    tenantId: string;
    payload: Record<string, any>;
    publishedAt: Date | null;
    createdAt: Date;
}

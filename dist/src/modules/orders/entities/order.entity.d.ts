export declare enum OrderStatus {
    DRAFT = "draft",
    CONFIRMED = "confirmed",
    CLOSED = "closed"
}
export declare class Order {
    id: string;
    tenantId: string;
    status: OrderStatus;
    version: number;
    totalCents: number | null;
    createdAt: Date;
    updatedAt: Date;
}

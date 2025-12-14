import { OrderStatus } from '../entities/order.entity';
export declare class OrderResponseDto {
    id: string;
    tenantId: string;
    status: OrderStatus;
    version: number;
    totalCents?: number | null;
    createdAt: Date;
    updatedAt?: Date;
}
export declare class CreateOrderResponseDto {
    id: string;
    tenantId: string;
    status: OrderStatus;
    version: number;
    createdAt: Date;
}
export declare class ConfirmOrderResponseDto {
    id: string;
    status: OrderStatus;
    version: number;
    totalCents: number;
}
export declare class CloseOrderResponseDto {
    id: string;
    status: OrderStatus;
    version: number;
}
export declare class ListOrdersResponseDto {
    items: OrderResponseDto[];
    nextCursor?: string;
}

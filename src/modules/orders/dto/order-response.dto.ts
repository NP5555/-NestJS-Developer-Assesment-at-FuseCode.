import { OrderStatus } from '../entities/order.entity';

export class OrderResponseDto {
  id: string;
  tenantId: string;
  status: OrderStatus;
  version: number;
  totalCents?: number | null;
  createdAt: Date;
  updatedAt?: Date;
}

export class CreateOrderResponseDto {
  id: string;
  tenantId: string;
  status: OrderStatus;
  version: number;
  createdAt: Date;
}

export class ConfirmOrderResponseDto {
  id: string;
  status: OrderStatus;
  version: number;
  totalCents: number;
}

export class CloseOrderResponseDto {
  id: string;
  status: OrderStatus;
  version: number;
}

export class ListOrdersResponseDto {
  items: OrderResponseDto[];
  nextCursor?: string;
}



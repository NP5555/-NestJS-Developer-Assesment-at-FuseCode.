import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import { CreateOrderResponseDto, ConfirmOrderResponseDto, CloseOrderResponseDto, ListOrdersResponseDto } from './dto/order-response.dto';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    create(tenantId: string, idempotencyKey: string, createOrderDto: CreateOrderDto): Promise<CreateOrderResponseDto>;
    confirm(id: string, tenantId: string, ifMatch: string, confirmOrderDto: ConfirmOrderDto): Promise<ConfirmOrderResponseDto>;
    close(id: string, tenantId: string): Promise<CloseOrderResponseDto>;
    list(tenantId: string, query: ListOrdersDto): Promise<ListOrdersResponseDto>;
}

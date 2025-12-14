import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { TenantGuard } from '../../tenant/tenant.guard';
import { TenantId } from '../../tenant/tenant.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import {
  CreateOrderResponseDto,
  ConfirmOrderResponseDto,
  CloseOrderResponseDto,
  ListOrdersResponseDto,
  OrderResponseDto,
} from './dto/order-response.dto';

@ApiTags('orders')
@Controller('api/v1/orders')
@UseGuards(TenantGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a new draft order (idempotent)' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({ name: 'X-Request-ID', required: false })
  @ApiResponse({ status: 200, type: CreateOrderResponseDto })
  @ApiResponse({ status: 409, description: 'Idempotency key conflict' })
  async create(
    @TenantId() tenantId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<CreateOrderResponseDto> {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const order = await this.ordersService.create(
      tenantId,
      idempotencyKey,
      createOrderDto,
    );

    return {
      id: order.id,
      tenantId: order.tenantId,
      status: order.status,
      version: order.version,
      createdAt: order.createdAt,
    };
  }

  @Patch(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm an order (optimistic locking)' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'If-Match', required: true })
  @ApiHeader({ name: 'X-Request-ID', required: false })
  @ApiResponse({ status: 200, type: ConfirmOrderResponseDto })
  @ApiResponse({ status: 409, description: 'Version mismatch' })
  async confirm(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Headers('if-match') ifMatch: string,
    @Body() confirmOrderDto: ConfirmOrderDto,
  ): Promise<ConfirmOrderResponseDto> {
    if (!ifMatch) {
      throw new BadRequestException('If-Match header is required');
    }

    const version = parseInt(ifMatch.replace(/"/g, ''), 10);
    if (isNaN(version)) {
      throw new BadRequestException('Invalid If-Match header: must be a version number');
    }

    const order = await this.ordersService.confirm(
      id,
      tenantId,
      version,
      confirmOrderDto.totalCents,
    );

    return {
      id: order.id,
      status: order.status,
      version: order.version,
      totalCents: order.totalCents!,
    };
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close an order and write to outbox' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'X-Request-ID', required: false })
  @ApiResponse({ status: 200, type: CloseOrderResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async close(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<CloseOrderResponseDto> {
    const order = await this.ordersService.close(id, tenantId);

    return {
      id: order.id,
      status: order.status,
      version: order.version,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List orders with keyset pagination' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'X-Request-ID', required: false })
  @ApiResponse({ status: 200, type: ListOrdersResponseDto })
  async list(
    @TenantId() tenantId: string,
    @Query() query: ListOrdersDto,
  ): Promise<ListOrdersResponseDto> {
    const result = await this.ordersService.list(
      tenantId,
      query.limit,
      query.cursor,
    );

    return {
      items: result.items.map((order) => ({
        id: order.id,
        tenantId: order.tenantId,
        status: order.status,
        version: order.version,
        totalCents: order.totalCents,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
      nextCursor: result.nextCursor,
    };
  }
}


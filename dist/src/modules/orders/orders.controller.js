"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const orders_service_1 = require("./orders.service");
const tenant_guard_1 = require("../../tenant/tenant.guard");
const tenant_decorator_1 = require("../../tenant/tenant.decorator");
const create_order_dto_1 = require("./dto/create-order.dto");
const confirm_order_dto_1 = require("./dto/confirm-order.dto");
const list_orders_dto_1 = require("./dto/list-orders.dto");
const order_response_dto_1 = require("./dto/order-response.dto");
let OrdersController = class OrdersController {
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    async create(tenantId, idempotencyKey, createOrderDto) {
        if (!idempotencyKey) {
            throw new common_1.BadRequestException('Idempotency-Key header is required');
        }
        const order = await this.ordersService.create(tenantId, idempotencyKey, createOrderDto);
        return {
            id: order.id,
            tenantId: order.tenantId,
            status: order.status,
            version: order.version,
            createdAt: order.createdAt,
        };
    }
    async confirm(id, tenantId, ifMatch, confirmOrderDto) {
        if (!ifMatch) {
            throw new common_1.BadRequestException('If-Match header is required');
        }
        const version = parseInt(ifMatch.replace(/"/g, ''), 10);
        if (isNaN(version)) {
            throw new common_1.BadRequestException('Invalid If-Match header: must be a version number');
        }
        const order = await this.ordersService.confirm(id, tenantId, version, confirmOrderDto.totalCents);
        return {
            id: order.id,
            status: order.status,
            version: order.version,
            totalCents: order.totalCents,
        };
    }
    async close(id, tenantId) {
        const order = await this.ordersService.close(id, tenantId);
        return {
            id: order.id,
            status: order.status,
            version: order.version,
        };
    }
    async list(tenantId, query) {
        const result = await this.ordersService.list(tenantId, query.limit, query.cursor);
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
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new draft order (idempotent)' }),
    (0, swagger_1.ApiHeader)({ name: 'X-Tenant-Id', required: true }),
    (0, swagger_1.ApiHeader)({ name: 'Idempotency-Key', required: true }),
    (0, swagger_1.ApiHeader)({ name: 'X-Request-ID', required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, type: order_response_dto_1.CreateOrderResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Idempotency key conflict' }),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Headers)('idempotency-key')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_order_dto_1.CreateOrderDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/confirm'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm an order (optimistic locking)' }),
    (0, swagger_1.ApiHeader)({ name: 'X-Tenant-Id', required: true }),
    (0, swagger_1.ApiHeader)({ name: 'If-Match', required: true }),
    (0, swagger_1.ApiHeader)({ name: 'X-Request-ID', required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, type: order_response_dto_1.ConfirmOrderResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Version mismatch' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, common_1.Headers)('if-match')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, confirm_order_dto_1.ConfirmOrderDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "confirm", null);
__decorate([
    (0, common_1.Post)(':id/close'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Close an order and write to outbox' }),
    (0, swagger_1.ApiHeader)({ name: 'X-Tenant-Id', required: true }),
    (0, swagger_1.ApiHeader)({ name: 'X-Request-ID', required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, type: order_response_dto_1.CloseOrderResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid status transition' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "close", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List orders with keyset pagination' }),
    (0, swagger_1.ApiHeader)({ name: 'X-Tenant-Id', required: true }),
    (0, swagger_1.ApiHeader)({ name: 'X-Request-ID', required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, type: order_response_dto_1.ListOrdersResponseDto }),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, list_orders_dto_1.ListOrdersDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "list", null);
exports.OrdersController = OrdersController = __decorate([
    (0, swagger_1.ApiTags)('orders'),
    (0, common_1.Controller)('api/v1/orders'),
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map
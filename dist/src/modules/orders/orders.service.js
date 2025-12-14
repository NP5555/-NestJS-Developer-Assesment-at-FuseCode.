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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
const order_entity_1 = require("./entities/order.entity");
const outbox_entity_1 = require("../../modules/outbox/entities/outbox.entity");
const event_publisher_service_1 = require("../../events/event-publisher.service");
const event_schema_1 = require("../../events/event-schema");
const error_codes_enum_1 = require("../../common/errors/error-codes.enum");
const crypto_1 = require("crypto");
let OrdersService = class OrdersService {
    constructor(orderRepository, outboxRepository, dataSource, eventPublisher, configService) {
        this.orderRepository = orderRepository;
        this.outboxRepository = outboxRepository;
        this.dataSource = dataSource;
        this.eventPublisher = eventPublisher;
        this.configService = configService;
        const redisConfig = this.configService.get('redis');
        this.redis = new ioredis_1.default({
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
        });
    }
    async create(tenantId, idempotencyKey, body) {
        const bodyHash = (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify(body))
            .digest('hex');
        const redisKey = `idempotency:${tenantId}:${idempotencyKey}`;
        const cached = await this.redis.get(redisKey);
        if (cached) {
            const cachedData = JSON.parse(cached);
            if (cachedData.bodyHash === bodyHash) {
                const order = await this.orderRepository.findOne({
                    where: { id: cachedData.orderId, tenantId },
                });
                if (order) {
                    return order;
                }
            }
            else {
                throw new common_1.ConflictException({
                    code: error_codes_enum_1.ErrorCode.IDEMPOTENCY_KEY_CONFLICT,
                    message: 'Idempotency key conflict: request body differs from original',
                });
            }
        }
        const order = this.orderRepository.create({
            tenantId,
            status: order_entity_1.OrderStatus.DRAFT,
            version: 1,
        });
        const savedOrder = await this.orderRepository.save(order);
        const cacheData = {
            orderId: savedOrder.id,
            responseJson: JSON.stringify(savedOrder),
            bodyHash,
        };
        const redisConfig = this.configService.get('redis');
        await this.redis.setex(redisKey, redisConfig.ttl, JSON.stringify(cacheData));
        await this.eventPublisher.publish(event_schema_1.EventType.ORDER_CREATED, tenantId, {
            orderId: savedOrder.id,
            tenantId: savedOrder.tenantId,
            status: savedOrder.status,
            version: savedOrder.version,
        });
        return savedOrder;
    }
    async confirm(id, tenantId, version, totalCents) {
        const order = await this.orderRepository.findOne({
            where: { id, tenantId },
        });
        if (!order) {
            throw new common_1.NotFoundException({
                code: error_codes_enum_1.ErrorCode.ORDER_NOT_FOUND,
                message: `Order with ID ${id} not found`,
                details: { orderId: id },
            });
        }
        if (order.version !== version) {
            throw new common_1.ConflictException({
                code: error_codes_enum_1.ErrorCode.VERSION_MISMATCH,
                message: 'Version mismatch: order has been modified',
                details: {
                    expectedVersion: version,
                    currentVersion: order.version,
                },
            });
        }
        if (order.status !== order_entity_1.OrderStatus.DRAFT) {
            throw new common_1.BadRequestException({
                code: error_codes_enum_1.ErrorCode.INVALID_STATUS_TRANSITION,
                message: `Cannot confirm order with status ${order.status}`,
                details: { currentStatus: order.status },
            });
        }
        order.status = order_entity_1.OrderStatus.CONFIRMED;
        order.totalCents = totalCents;
        order.version += 1;
        const savedOrder = await this.orderRepository.save(order);
        await this.eventPublisher.publish(event_schema_1.EventType.ORDER_CONFIRMED, tenantId, {
            orderId: savedOrder.id,
            tenantId: savedOrder.tenantId,
            status: savedOrder.status,
            version: savedOrder.version,
            totalCents: savedOrder.totalCents,
        });
        return savedOrder;
    }
    async close(id, tenantId) {
        const order = await this.orderRepository.findOne({
            where: { id, tenantId },
        });
        if (!order) {
            throw new common_1.NotFoundException({
                code: error_codes_enum_1.ErrorCode.ORDER_NOT_FOUND,
                message: `Order with ID ${id} not found`,
                details: { orderId: id },
            });
        }
        if (order.status !== order_entity_1.OrderStatus.CONFIRMED) {
            throw new common_1.BadRequestException({
                code: error_codes_enum_1.ErrorCode.INVALID_STATUS_TRANSITION,
                message: `Cannot close order with status ${order.status}`,
                details: { currentStatus: order.status },
            });
        }
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            order.status = order_entity_1.OrderStatus.CLOSED;
            order.version += 1;
            const savedOrder = await queryRunner.manager.save(order);
            const outbox = queryRunner.manager.create(outbox_entity_1.Outbox, {
                eventType: 'orders.closed',
                orderId: savedOrder.id,
                tenantId: savedOrder.tenantId,
                payload: {
                    orderId: savedOrder.id,
                    tenantId: savedOrder.tenantId,
                    totalCents: savedOrder.totalCents,
                    closedAt: new Date().toISOString(),
                },
            });
            await queryRunner.manager.save(outbox);
            await queryRunner.commitTransaction();
            await this.eventPublisher.publish(event_schema_1.EventType.ORDER_CLOSED, tenantId, {
                orderId: savedOrder.id,
                tenantId: savedOrder.tenantId,
                status: savedOrder.status,
                version: savedOrder.version,
                totalCents: savedOrder.totalCents,
            });
            return savedOrder;
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async list(tenantId, limit = 20, cursor) {
        const queryBuilder = this.orderRepository
            .createQueryBuilder('order')
            .where('order.tenantId = :tenantId', { tenantId })
            .orderBy('order.createdAt', 'DESC')
            .addOrderBy('order.id', 'DESC')
            .limit(limit + 1);
        if (cursor) {
            try {
                const cursorData = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
                queryBuilder.andWhere('(order.createdAt < :createdAt OR (order.createdAt = :createdAt AND order.id < :id))', {
                    createdAt: cursorData.createdAt,
                    id: cursorData.id,
                });
            }
            catch (error) {
                throw new common_1.BadRequestException({
                    code: error_codes_enum_1.ErrorCode.BAD_REQUEST,
                    message: 'Invalid cursor format',
                });
            }
        }
        const orders = await queryBuilder.getMany();
        let nextCursor;
        if (orders.length > limit) {
            const lastOrder = orders[limit - 1];
            const cursorData = {
                createdAt: lastOrder.createdAt.toISOString(),
                id: lastOrder.id,
            };
            nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
            orders.pop();
        }
        return {
            items: orders,
            nextCursor,
        };
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(outbox_entity_1.Outbox)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        event_publisher_service_1.EventPublisherService,
        config_1.ConfigService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map
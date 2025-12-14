import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Order, OrderStatus } from './entities/order.entity';
import { Outbox } from '../../modules/outbox/entities/outbox.entity';
import { EventPublisherService } from '../../events/event-publisher.service';
import { EventType } from '../../events/event-schema';
import { ErrorCode } from '../../common/errors/error-codes.enum';
import { redisConfigKey } from '../../config/redis.config';
import { createHash } from 'crypto';

interface IdempotencyCache {
  orderId: string;
  responseJson: string;
  bodyHash: string;
}

interface CursorData {
  createdAt: string;
  id: string;
}

@Injectable()
export class OrdersService {
  private redis: Redis;

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Outbox)
    private outboxRepository: Repository<Outbox>,
    private dataSource: DataSource,
    private eventPublisher: EventPublisherService,
    private configService: ConfigService,
  ) {
    const redisConfig = this.configService.get('redis');
    this.redis = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
    });
  }

  async create(
    tenantId: string,
    idempotencyKey: string,
    body: any,
  ): Promise<Order> {
    // Hash the request body for idempotency check
    const bodyHash = createHash('sha256')
      .update(JSON.stringify(body))
      .digest('hex');

    const redisKey = `idempotency:${tenantId}:${idempotencyKey}`;

    // Check Redis for existing idempotency key
    const cached = await this.redis.get(redisKey);
    if (cached) {
      const cachedData: IdempotencyCache = JSON.parse(cached);

      // If body hash matches, return cached response
      if (cachedData.bodyHash === bodyHash) {
        const order = await this.orderRepository.findOne({
          where: { id: cachedData.orderId, tenantId },
        });
        if (order) {
          return order;
        }
      } else {
        // Same key but different body - conflict
        throw new ConflictException({
          code: ErrorCode.IDEMPOTENCY_KEY_CONFLICT,
          message: 'Idempotency key conflict: request body differs from original',
        });
      }
    }

    // Create new order
    const order = this.orderRepository.create({
      tenantId,
      status: OrderStatus.DRAFT,
      version: 1,
    });

    const savedOrder = await this.orderRepository.save(order);

    // Cache idempotency response
    const cacheData: IdempotencyCache = {
      orderId: savedOrder.id,
      responseJson: JSON.stringify(savedOrder),
      bodyHash,
    };
    const redisConfig = this.configService.get('redis');
    await this.redis.setex(
      redisKey,
      redisConfig.ttl,
      JSON.stringify(cacheData),
    );

    // Publish event
    await this.eventPublisher.publish(EventType.ORDER_CREATED, tenantId, {
      orderId: savedOrder.id,
      tenantId: savedOrder.tenantId,
      status: savedOrder.status,
      version: savedOrder.version,
    });

    return savedOrder;
  }

  async confirm(
    id: string,
    tenantId: string,
    version: number,
    totalCents: number,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id, tenantId },
    });

    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.ORDER_NOT_FOUND,
        message: `Order with ID ${id} not found`,
        details: { orderId: id },
      });
    }

    // Check version (optimistic locking)
    if (order.version !== version) {
      throw new ConflictException({
        code: ErrorCode.VERSION_MISMATCH,
        message: 'Version mismatch: order has been modified',
        details: {
          expectedVersion: version,
          currentVersion: order.version,
        },
      });
    }

    // Check status transition
    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_STATUS_TRANSITION,
        message: `Cannot confirm order with status ${order.status}`,
        details: { currentStatus: order.status },
      });
    }

    // Update order
    order.status = OrderStatus.CONFIRMED;
    order.totalCents = totalCents;
    order.version += 1;

    const savedOrder = await this.orderRepository.save(order);

    // Publish event
    await this.eventPublisher.publish(EventType.ORDER_CONFIRMED, tenantId, {
      orderId: savedOrder.id,
      tenantId: savedOrder.tenantId,
      status: savedOrder.status,
      version: savedOrder.version,
      totalCents: savedOrder.totalCents,
    });

    return savedOrder;
  }

  async close(id: string, tenantId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id, tenantId },
    });

    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.ORDER_NOT_FOUND,
        message: `Order with ID ${id} not found`,
        details: { orderId: id },
      });
    }

    // Check preconditions
    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_STATUS_TRANSITION,
        message: `Cannot close order with status ${order.status}`,
        details: { currentStatus: order.status },
      });
    }

    // Use transaction for atomic update + outbox insert
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update order
      order.status = OrderStatus.CLOSED;
      order.version += 1;
      const savedOrder = await queryRunner.manager.save(order);

      // Insert into outbox
      const outbox = queryRunner.manager.create(Outbox, {
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

      // Publish event (after transaction commit)
      await this.eventPublisher.publish(EventType.ORDER_CLOSED, tenantId, {
        orderId: savedOrder.id,
        tenantId: savedOrder.tenantId,
        status: savedOrder.status,
        version: savedOrder.version,
        totalCents: savedOrder.totalCents,
      });

      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async list(
    tenantId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<{ items: Order[]; nextCursor?: string }> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .where('order.tenantId = :tenantId', { tenantId })
      .orderBy('order.createdAt', 'DESC')
      .addOrderBy('order.id', 'DESC')
      .limit(limit + 1); // Fetch one extra to determine if there's a next page

    // Apply cursor if provided
    if (cursor) {
      try {
        const cursorData: CursorData = JSON.parse(
          Buffer.from(cursor, 'base64').toString('utf-8'),
        );
        queryBuilder.andWhere(
          '(order.createdAt < :createdAt OR (order.createdAt = :createdAt AND order.id < :id))',
          {
            createdAt: cursorData.createdAt,
            id: cursorData.id,
          },
        );
      } catch (error) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          message: 'Invalid cursor format',
        });
      }
    }

    const orders = await queryBuilder.getMany();

    // Determine if there's a next page
    let nextCursor: string | undefined;
    if (orders.length > limit) {
      const lastOrder = orders[limit - 1];
      const cursorData: CursorData = {
        createdAt: lastOrder.createdAt.toISOString(),
        id: lastOrder.id,
      };
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
      orders.pop(); // Remove the extra item
    }

    return {
      items: orders,
      nextCursor,
    };
  }
}


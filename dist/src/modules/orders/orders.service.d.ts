import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Order } from './entities/order.entity';
import { Outbox } from '../../modules/outbox/entities/outbox.entity';
import { EventPublisherService } from '../../events/event-publisher.service';
export declare class OrdersService {
    private orderRepository;
    private outboxRepository;
    private dataSource;
    private eventPublisher;
    private configService;
    private redis;
    constructor(orderRepository: Repository<Order>, outboxRepository: Repository<Outbox>, dataSource: DataSource, eventPublisher: EventPublisherService, configService: ConfigService);
    create(tenantId: string, idempotencyKey: string, body: any): Promise<Order>;
    confirm(id: string, tenantId: string, version: number, totalCents: number): Promise<Order>;
    close(id: string, tenantId: string): Promise<Order>;
    list(tenantId: string, limit?: number, cursor?: string): Promise<{
        items: Order[];
        nextCursor?: string;
    }>;
}

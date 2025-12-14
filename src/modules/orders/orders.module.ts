import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OutboxModule } from '../outbox/outbox.module';
import { EventsModule } from '../../events/events.module';
import { Outbox } from '../outbox/entities/outbox.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Outbox]),
    OutboxModule,
    EventsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}



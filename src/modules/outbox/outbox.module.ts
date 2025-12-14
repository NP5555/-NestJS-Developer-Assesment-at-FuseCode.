import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Outbox } from './entities/outbox.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Outbox])],
  exports: [TypeOrmModule],
})
export class OutboxModule {}



import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum OrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  CLOSED = 'closed',
}

@Entity('orders')
@Index(['tenantId', 'createdAt', 'id'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', name: 'tenant_id' })
  tenantId: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.DRAFT,
  })
  status: OrderStatus;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'int', name: 'total_cents', nullable: true })
  totalCents: number | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}

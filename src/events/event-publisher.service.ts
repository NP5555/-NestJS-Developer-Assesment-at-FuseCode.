import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { EventEnvelope, EventType } from './event-schema';
import { correlationStorage } from '../common/correlation/correlation.interceptor';

@Injectable()
export class EventPublisherService {
  private readonly logger = new Logger(EventPublisherService.name);

  /**
   * Mock Pulsar client - logs events instead of publishing
   * In production, this would publish to Apache Pulsar
   */
  async publish(eventType: EventType, tenantId: string, data: Record<string, any>): Promise<void> {
    const correlationId = correlationStorage.getStore();

    const envelope: EventEnvelope = {
      id: uuidv4(),
      type: eventType,
      source: 'orders-service',
      tenantId,
      time: new Date().toISOString(),
      schemaVersion: '1',
      ...(correlationId && { traceId: correlationId }),
      data,
    };

    // Mock: Log the event instead of publishing to Pulsar
    this.logger.log(`[MOCK] Publishing event: ${eventType}`, {
      envelope,
    });

    // In production, this would be:
    // await this.pulsarClient.producer.send(envelope);
  }
}



import { EventType } from './event-schema';
export declare class EventPublisherService {
    private readonly logger;
    publish(eventType: EventType, tenantId: string, data: Record<string, any>): Promise<void>;
}

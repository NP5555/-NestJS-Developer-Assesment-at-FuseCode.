"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var EventPublisherService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventPublisherService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const correlation_interceptor_1 = require("../common/correlation/correlation.interceptor");
let EventPublisherService = EventPublisherService_1 = class EventPublisherService {
    constructor() {
        this.logger = new common_1.Logger(EventPublisherService_1.name);
    }
    async publish(eventType, tenantId, data) {
        const correlationId = correlation_interceptor_1.correlationStorage.getStore();
        const envelope = {
            id: (0, uuid_1.v4)(),
            type: eventType,
            source: 'orders-service',
            tenantId,
            time: new Date().toISOString(),
            schemaVersion: '1',
            ...(correlationId && { traceId: correlationId }),
            data,
        };
        this.logger.log(`[MOCK] Publishing event: ${eventType}`, {
            envelope,
        });
    }
};
exports.EventPublisherService = EventPublisherService;
exports.EventPublisherService = EventPublisherService = EventPublisherService_1 = __decorate([
    (0, common_1.Injectable)()
], EventPublisherService);
//# sourceMappingURL=event-publisher.service.js.map
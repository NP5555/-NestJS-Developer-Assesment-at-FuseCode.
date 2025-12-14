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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Outbox = void 0;
const typeorm_1 = require("typeorm");
let Outbox = class Outbox {
};
exports.Outbox = Outbox;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Outbox.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'event_type' }),
    __metadata("design:type", String)
], Outbox.prototype, "eventType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'order_id' }),
    __metadata("design:type", String)
], Outbox.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'tenant_id' }),
    __metadata("design:type", String)
], Outbox.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], Outbox.prototype, "payload", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'published_at', nullable: true }),
    __metadata("design:type", Date)
], Outbox.prototype, "publishedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], Outbox.prototype, "createdAt", void 0);
exports.Outbox = Outbox = __decorate([
    (0, typeorm_1.Entity)('outbox')
], Outbox);
//# sourceMappingURL=outbox.entity.js.map
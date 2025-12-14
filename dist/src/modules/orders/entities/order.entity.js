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
exports.Order = exports.OrderStatus = void 0;
const typeorm_1 = require("typeorm");
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["DRAFT"] = "draft";
    OrderStatus["CONFIRMED"] = "confirmed";
    OrderStatus["CLOSED"] = "closed";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
let Order = class Order {
};
exports.Order = Order;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Order.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'tenant_id' }),
    __metadata("design:type", String)
], Order.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: OrderStatus,
        default: OrderStatus.DRAFT,
    }),
    __metadata("design:type", String)
], Order.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], Order.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', name: 'total_cents', nullable: true }),
    __metadata("design:type", Number)
], Order.prototype, "totalCents", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], Order.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz', name: 'updated_at' }),
    __metadata("design:type", Date)
], Order.prototype, "updatedAt", void 0);
exports.Order = Order = __decorate([
    (0, typeorm_1.Entity)('orders'),
    (0, typeorm_1.Index)(['tenantId', 'createdAt', 'id'])
], Order);
//# sourceMappingURL=order.entity.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorrelationId = void 0;
const common_1 = require("@nestjs/common");
const correlation_interceptor_1 = require("./correlation.interceptor");
exports.CorrelationId = (0, common_1.createParamDecorator)((data, ctx) => {
    return correlation_interceptor_1.correlationStorage.getStore();
});
//# sourceMappingURL=correlation.decorator.js.map
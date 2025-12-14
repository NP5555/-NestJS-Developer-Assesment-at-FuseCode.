"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConfigKey = void 0;
const config_1 = require("@nestjs/config");
exports.redisConfigKey = 'redis';
exports.default = (0, config_1.registerAs)(exports.redisConfigKey, () => ({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    ttl: parseInt(process.env.IDEMPOTENCY_TTL_SECONDS || '3600', 10),
}));
//# sourceMappingURL=redis.config.js.map
import { registerAs } from '@nestjs/config';

export const redisConfigKey = 'redis';

export default registerAs(redisConfigKey, () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  ttl: parseInt(process.env.IDEMPOTENCY_TTL_SECONDS || '3600', 10),
}));


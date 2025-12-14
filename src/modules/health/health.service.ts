import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
  private redis: Redis;

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {
    const redisConfig = this.configService.get('redis');
    this.redis = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      retryStrategy: () => null, // Don't retry on connection failure
      maxRetriesPerRequest: 1,
    });
  }

  async checkDatabase(): Promise<'up' | 'down'> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'up';
    } catch (error) {
      return 'down';
    }
  }

  async checkRedis(): Promise<'up' | 'down'> {
    try {
      await this.redis.ping();
      return 'up';
    } catch (error) {
      return 'down';
    }
  }

  async checkReadiness(): Promise<{
    status: 'ready' | 'not_ready';
    checks: {
      database: 'up' | 'down';
      redis: 'up' | 'down';
    };
  }> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const status = database === 'up' && redis === 'up' ? 'ready' : 'not_ready';

    return {
      status,
      checks: {
        database,
        redis,
      },
    };
  }
}



import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { correlationStorage } from './correlation.interceptor';

export const CorrelationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    return correlationStorage.getStore();
  },
);



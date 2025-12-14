import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

export const correlationStorage = new AsyncLocalStorage<string>();

@Injectable()
export class CorrelationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Extract or generate correlation ID
    const correlationId =
      (request.headers['x-request-id'] as string) || uuidv4();

    // Store in AsyncLocalStorage for use in services
    return correlationStorage.run(correlationId, () => {
      // Add to response headers
      response.setHeader('X-Request-ID', correlationId);

      return next.handle().pipe(
        tap(() => {
          // Logging can be added here if needed
        }),
      );
    });
  }
}



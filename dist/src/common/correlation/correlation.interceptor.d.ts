import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AsyncLocalStorage } from 'async_hooks';
export declare const correlationStorage: AsyncLocalStorage<string>;
export declare class CorrelationInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}

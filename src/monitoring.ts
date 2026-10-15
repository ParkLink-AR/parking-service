import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

// Error reports to Sentry. Without SENTRY_DSN it stays off (development): nothing is sent.
const dsn = process.env.SENTRY_DSN;

export function initMonitoring(): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || 'production',
    serverName: 'parking-service',
    tracesSampleRate: 0,
    sendDefaultPii: false,
    initialScope: { tags: { service: 'parking-service' } },
  });
}

/**
 * Reports what ended a request in a 5xx -- an unexpected exception, or a 5xx HttpException
 * (e.g. booking-service unavailable) -- then answers exactly as Nest would. 4xx (validation,
 * not found, forbidden) are normal answers, not errors.
 */
@Catch()
export class MonitoringExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    if (dsn && status >= 500) Sentry.captureException(exception);
    super.catch(exception, host);
  }
}

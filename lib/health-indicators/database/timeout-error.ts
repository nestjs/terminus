import { HealthCheckError } from '@godaddy/terminus';

export class TimeoutError extends HealthCheckError {
  constructor(timeout: number, cause: unknown) {
    super(`Database did not respond after ${timeout}ms`, cause);
  }
}

import { HealthCheckError } from '@godaddy/terminus';

export class TimeoutError extends HealthCheckError {
  constructor(timeout, cause) {
    super(`Database did not respond after ${timeout}ms`, cause);
  }
}

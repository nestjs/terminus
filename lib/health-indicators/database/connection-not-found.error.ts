import { HealthCheckError } from '@godaddy/terminus';

export class ConnectionNotFoundError extends HealthCheckError {
  constructor(cause) {
    super('Connection provider not found in application context', cause);
  }
}

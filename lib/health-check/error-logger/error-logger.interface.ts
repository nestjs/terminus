import { HealthIndicatorResult } from '../../health-indicator';

export interface ErrorLogger {
  getErrorMessage(message: string, causes: HealthIndicatorResult): string;
}

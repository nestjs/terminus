import { type HealthIndicatorResult } from '../../health-indicator/health-indicator-result.interface.js';

export interface ErrorLogger {
  getErrorMessage(message: string, causes: HealthIndicatorResult): string;
}

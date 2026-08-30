import { type HealthIndicatorResult } from '../../health-indicator/index.js';

export interface ErrorLogger {
  getErrorMessage(message: string, causes: HealthIndicatorResult): string;
}

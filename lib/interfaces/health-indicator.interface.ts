export type HealthCheckResult = any;

export type HealthCheckFunction = () => Promise<HealthCheckResult>;

export interface HealthIndicator {
  isHealthy(): Promise<HealthCheckResult>;
}

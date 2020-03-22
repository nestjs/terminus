import { Injectable, BeforeApplicationShutdown } from '@nestjs/common';
import { HealthIndicatorFunction } from '../health-indicator';
import { HealthCheckExecutor } from './health-check-executor.service';

@Injectable()
export class HealthCheckService implements BeforeApplicationShutdown {
  private isShuttingDown: boolean = false;
  constructor(private healthCheckExecutor: HealthCheckExecutor) {}

  public async check(healthIndicators: HealthIndicatorFunction[]) {
    const status = await this.healthCheckExecutor.execute(healthIndicators);
    if (this.isShuttingDown) {
      delete status.status;
      return { status: 'shutting_down', ...status };
    }
    return status;
  }

  beforeApplicationShutdown() {
    this.isShuttingDown = true;
    return new Promise(resolve => setTimeout(() => resolve(), 5000));
  }
}

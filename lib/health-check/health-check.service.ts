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
      // TODO: Omit "status" and then prepend the new status so JSON order does not change
      return { ...status, status: 'shutting_down' };
    }
    return status;
  }

  beforeApplicationShutdown() {
    // Maybe configurable
    this.isShuttingDown = true;
  }
}

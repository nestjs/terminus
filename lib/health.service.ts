import { Injectable, BeforeApplicationShutdown } from '@nestjs/common';
import { HealthIndicatorFunction } from './interfaces';
import { HealthIndicatorExecutor } from './health-indicator-executor.service';

@Injectable()
export class HealthService implements BeforeApplicationShutdown {
  private isShuttingDown: boolean = false;
  constructor(private healthIndicatorExecutor: HealthIndicatorExecutor) {}

  public async check(healthIndicators: HealthIndicatorFunction[]) {
    const status = await this.healthIndicatorExecutor.execute(healthIndicators);
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

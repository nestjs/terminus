import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  DiskHealthIndicator,
  HealthCheck,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // The used disk storage should not exceed 50% of the full disk size
      () =>
        this.disk.checkStorage('disk health', {
          thresholdPercent: 0.5,
          path: '/',
        }),
      // The used disk storage should not exceed 250 GB
      () =>
        this.disk.checkStorage('disk health', {
          threshold: 250 * 1024 * 1024 * 1024,
          path: '/',
        }),
    ]);
  }
}

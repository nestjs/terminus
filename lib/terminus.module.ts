import { Module } from '@nestjs/common';
import { DiskUsageLibProvider } from './health-indicator/disk/disk-usage-lib.provider';
import { HEALTH_INDICATORS } from './health-indicator/health-indicators.provider';
import { HealthCheckService } from './health-check';
import { HealthCheckExecutor } from './health-check/health-check-executor.service';

/**
 * The Terminus module integrates health checks
 * and graceful shutdowns in your Nest application
 *
 * @publicApi
 */
@Module({
  providers: [
    DiskUsageLibProvider,
    HealthCheckExecutor,
    HealthCheckService,
    ...HEALTH_INDICATORS,
  ],
  exports: [HealthCheckService, ...HEALTH_INDICATORS],
})
export class TerminusModule {}

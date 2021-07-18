import { Module } from '@nestjs/common';
import { DiskusageLibProvider } from './health-indicator/disk/diskusage-lib.provider';
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
    DiskusageLibProvider,
    HealthCheckExecutor,
    HealthCheckService,
    ...HEALTH_INDICATORS,
  ],
  exports: [HealthCheckService, ...HEALTH_INDICATORS],
})
export class TerminusModule {}

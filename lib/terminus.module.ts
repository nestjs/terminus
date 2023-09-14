import { DynamicModule, Module } from '@nestjs/common';
import { HealthCheckService } from './health-check';
import { getErrorLoggerProvider } from './health-check/error-logger/error-logger.provider';
import { ERROR_LOGGERS } from './health-check/error-logger/error-loggers.provider';
import { HealthCheckExecutor } from './health-check/health-check-executor.service';
import { getLoggerProvider } from './health-check/logger/logger.provider';
import { DiskUsageLibProvider } from './health-indicator/disk/disk-usage-lib.provider';
import { HEALTH_INDICATORS } from './health-indicator/health-indicators.provider';
import { TerminusModuleOptions } from './terminus-options.interface';

const providers = [
  ...ERROR_LOGGERS,
  DiskUsageLibProvider,
  HealthCheckExecutor,
  HealthCheckService,
  ...HEALTH_INDICATORS,
];

const exports_ = [HealthCheckService, ...HEALTH_INDICATORS];

/**
 * The Terminus module integrates health checks
 * and graceful shutdowns in your Nest application
 *
 * @publicApi
 */
@Module({
  providers: [...providers, getErrorLoggerProvider(), getLoggerProvider()],
  exports: exports_,
})
export class TerminusModule {
  static forRoot(options: TerminusModuleOptions = {}): DynamicModule {
    const { errorLogStyle = 'json', logger = true } = options;

    return {
      module: TerminusModule,
      providers: [
        ...providers,
        getErrorLoggerProvider(errorLogStyle),
        getLoggerProvider(logger),
      ],
      exports: exports_,
    };
  }
}

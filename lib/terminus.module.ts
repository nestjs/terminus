import { DynamicModule, Module } from '@nestjs/common';
import { DiskUsageLibProvider } from './health-indicator/disk/disk-usage-lib.provider';
import { HEALTH_INDICATORS } from './health-indicator/health-indicators.provider';
import { HealthCheckService } from './health-check';
import { HealthCheckExecutor } from './health-check/health-check-executor.service';
import { ERROR_LOGGERS } from './health-check/error-logger/error-loggers.provider';
import { getErrorLoggerProvider } from './health-check/error-logger/error-logger.provider';
import { TerminusModuleOptions } from './terminus-options.interface';
import { getLoggerProvider } from './health-check/logger/logger.provider';

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

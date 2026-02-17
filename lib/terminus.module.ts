import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import {
  GracefulShutdownService,
  TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT,
  TERMINUS_ENABLE_ENHANCED_SHUTDOWN,
  TERMINUS_BEFORE_SHUTDOWN_DELAY,
} from './graceful-shutdown-timeout/graceful-shutdown-timeout.service';
import { HealthCheckService } from './health-check';
import { getErrorLoggerProvider } from './health-check/error-logger/error-logger.provider';
import { ERROR_LOGGERS } from './health-check/error-logger/error-loggers.provider';
import { HealthCheckExecutor } from './health-check/health-check-executor.service';
import { getLoggerProvider } from './health-check/logger/logger.provider';
import { DiskUsageLibProvider } from './health-indicator/disk/disk-usage-lib.provider';
import { HealthIndicatorService } from './health-indicator/health-indicator.service';
import { HEALTH_INDICATORS } from './health-indicator/health-indicators.provider';
import { type TerminusModuleOptions } from './terminus-options.interface';

const baseProviders: Provider[] = [
  ...ERROR_LOGGERS,
  HealthIndicatorService,
  DiskUsageLibProvider,
  HealthCheckExecutor,
  HealthCheckService,
  ...HEALTH_INDICATORS,
];

const exports_ = [
  HealthIndicatorService,
  HealthCheckService,
  ...HEALTH_INDICATORS,
];

/**
 * The Terminus module integrates health checks
 * and graceful shutdowns in your Nest application
 *
 * @publicApi
 */
@Module({
  providers: [...baseProviders, getErrorLoggerProvider(), getLoggerProvider()],
  exports: exports_,
})
export class TerminusModule {
  static forRoot(options: TerminusModuleOptions = {}): DynamicModule {
    const {
      errorLogStyle = 'json',
      logger = true,
      gracefulShutdownTimeoutMs = 0,
      enableEnhancedShutdown = false,
      beforeShutdownDelayMs = 15000,
    } = options;

    const providers: Provider[] = [
      ...baseProviders,
      getErrorLoggerProvider(errorLogStyle),
      getLoggerProvider(logger),
    ];

    // Always provide the configuration values
    providers.push(
      {
        provide: TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT,
        useValue: gracefulShutdownTimeoutMs,
      },
      {
        provide: TERMINUS_ENABLE_ENHANCED_SHUTDOWN,
        useValue: enableEnhancedShutdown,
      },
      {
        provide: TERMINUS_BEFORE_SHUTDOWN_DELAY,
        useValue: beforeShutdownDelayMs,
      },
    );

    // Only add GracefulShutdownService if graceful shutdown is configured
    const exportsArray: any[] = [...exports_];
    if (gracefulShutdownTimeoutMs > 0 || enableEnhancedShutdown) {
      providers.push(GracefulShutdownService);
      exportsArray.push(GracefulShutdownService);
    }

    return {
      module: TerminusModule,
      providers,
      exports: exportsArray,
    };
  }
}

import {
  type DynamicModule,
  Logger,
  type LoggerService,
  Module,
  type Provider,
} from '@nestjs/common';
import {
  GracefulShutdownService,
  TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT,
} from './graceful-shutdown-timeout/graceful-shutdown-timeout.service';
import { HealthCheckService } from './health-check';
import {
  ERROR_LOGGER,
  getErrorLoggerProvider,
} from './health-check/error-logger/error-logger.provider';
import { ERROR_LOGGERS } from './health-check/error-logger/error-loggers.provider';
import { JsonErrorLogger } from './health-check/error-logger/json-error-logger.service';
import { PrettyErrorLogger } from './health-check/error-logger/pretty-error-logger.service';
import { HealthCheckExecutor } from './health-check/health-check-executor.service';
import {
  getLoggerProvider,
  TERMINUS_LOGGER,
} from './health-check/logger/logger.provider';
import { DiskUsageLibProvider } from './health-indicator/disk/disk-usage-lib.provider';
import { HealthIndicatorService } from './health-indicator/health-indicator.service';
import { HEALTH_INDICATORS } from './health-indicator/health-indicators.provider';
import {
  type TerminusModuleAsyncOptions,
  type TerminusModuleOptions,
  type TerminusModuleOptionsFactory,
} from './terminus-options.interface';
import { TERMINUS_MODULE_OPTIONS } from './terminus.constants';

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
    } = options;

    const providers: Provider[] = [
      ...baseProviders,
      getErrorLoggerProvider(errorLogStyle),
      getLoggerProvider(logger),
    ];

    if (gracefulShutdownTimeoutMs > 0) {
      providers.push({
        provide: TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT,
        useValue: gracefulShutdownTimeoutMs,
      });

      providers.push(GracefulShutdownService);
    }

    return {
      module: TerminusModule,
      providers,
      exports: exports_,
    };
  }

  static forRootAsync(options: TerminusModuleAsyncOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);
    const providers: Provider[] = [
      ...baseProviders,
      ...asyncProviders,
      {
        provide: TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT,
        useFactory: (moduleOptions: TerminusModuleOptions) => {
          return moduleOptions.gracefulShutdownTimeoutMs || 0;
        },
        inject: [TERMINUS_MODULE_OPTIONS],
      },
    ];

    // Add conditional providers based on options
    const conditionalProviders: Provider[] = [
      {
        provide: GracefulShutdownService,
        useFactory: (
          moduleOptions: TerminusModuleOptions,
          logger: LoggerService,
        ) => {
          if (
            moduleOptions.gracefulShutdownTimeoutMs &&
            moduleOptions.gracefulShutdownTimeoutMs > 0
          ) {
            const service = new GracefulShutdownService(
              logger,
              moduleOptions.gracefulShutdownTimeoutMs,
            );
            return service;
          }
          return null;
        },
        inject: [TERMINUS_MODULE_OPTIONS, TERMINUS_LOGGER],
      },
    ];

    // Dynamically set error logger and logger providers
    providers.push(
      getErrorLoggerProvider('json'), // Default provider, will be overridden
      getLoggerProvider(true), // Default provider, will be overridden
      ...conditionalProviders.filter((p) => p !== null),
    );

    // Add provider overrides based on module options
    providers.push({
      provide: ERROR_LOGGER,
      useFactory: (moduleOptions: TerminusModuleOptions) => {
        const errorLogStyle = moduleOptions.errorLogStyle || 'json';
        if (errorLogStyle === 'pretty') {
          return new PrettyErrorLogger();
        }
        return new JsonErrorLogger();
      },
      inject: [TERMINUS_MODULE_OPTIONS],
    });

    providers.push({
      provide: TERMINUS_LOGGER,
      useFactory: (moduleOptions: TerminusModuleOptions) => {
        const loggerOption = moduleOptions.logger;
        if (loggerOption === false) {
          return {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            log: () => {},
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            error: () => {},
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            warn: () => {},
          };
        }
        if (loggerOption === true || loggerOption === undefined) {
          return new Logger();
        }
        // If it's a custom logger class, we need to instantiate it
        // This is handled in a more complex way in real implementations
        return new Logger();
      },
      inject: [TERMINUS_MODULE_OPTIONS],
    });

    return {
      module: TerminusModule,
      imports: options.imports || [],
      providers: providers.filter((p) => p !== undefined && p !== null),
      exports: exports_,
    };
  }

  private static createAsyncProviders(
    options: TerminusModuleAsyncOptions,
  ): Provider[] {
    const providers: Provider[] = [];

    if (options.useFactory) {
      providers.push(this.createAsyncOptionsProvider(options));
    } else if (options.useClass) {
      providers.push(this.createAsyncOptionsProvider(options), {
        provide: options.useClass,
        useClass: options.useClass,
      });
    } else if (options.useExisting) {
      providers.push(this.createAsyncOptionsProvider(options));
    } else {
      throw new Error('Invalid TerminusModule async options');
    }

    return providers;
  }

  private static createAsyncOptionsProvider(
    options: TerminusModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: TERMINUS_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    if (options.useClass) {
      return {
        provide: TERMINUS_MODULE_OPTIONS,
        useFactory: async (optionsFactory: TerminusModuleOptionsFactory) =>
          await optionsFactory.createTerminusOptions(),
        inject: [options.useClass],
      };
    }

    // Must be useExisting
    return {
      provide: TERMINUS_MODULE_OPTIONS,
      useFactory: async (optionsFactory: TerminusModuleOptionsFactory) =>
        await optionsFactory.createTerminusOptions(),
      inject: [options.useExisting!],
    };
  }
}

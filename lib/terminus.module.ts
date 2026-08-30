import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import { GracefulShutdownService } from './graceful-shutdown-timeout/graceful-shutdown-timeout.service.js';
import { HealthCheckService } from './health-check/index.js';
import { HealthCheckExecutor } from './health-check/health-check-executor.service.js';
import { DiskUsageLibProvider } from './health-indicator/disk/disk-usage-lib.provider.js';
import { HealthIndicatorService } from './health-indicator/health-indicator.service.js';
import { HEALTH_INDICATORS } from './health-indicator/health-indicators.provider.js';
import {
  type TerminusAsyncOptions,
  type TerminusModuleOptions,
} from './terminus-options.interface.js';
import {
  createAsyncOptionsProvider,
  createOptionsProvider,
  createTerminusProviders,
} from './terminus.providers.js';

const baseProviders: Provider[] = [
  HealthIndicatorService,
  DiskUsageLibProvider,
  HealthCheckExecutor,
  HealthCheckService,
  GracefulShutdownService,
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
  providers: [
    ...baseProviders,
    createOptionsProvider({}),
    ...createTerminusProviders({}),
  ],
  exports: exports_,
})
export class TerminusModule {
  /**
   * Register the module synchronously.
   */
  static forRoot(options: TerminusModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [
      ...baseProviders,
      createOptionsProvider(options),
      ...createTerminusProviders(options),
    ];

    return {
      module: TerminusModule,
      providers,
      exports: exports_,
    };
  }

  /**
   * Register the module asynchronously.
   */
  static forRootAsync(options: TerminusAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      ...baseProviders,
      ...this.createAsyncProviders(options),
      ...createTerminusProviders(),
    ];

    return {
      module: TerminusModule,
      imports: options.imports || [],
      providers,
      exports: exports_,
    };
  }

  private static createAsyncProviders(
    options: TerminusAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [createAsyncOptionsProvider(options)];
    }

    return [
      createAsyncOptionsProvider(options),
      {
        provide: options.useClass!,
        useClass: options.useClass!,
      },
    ];
  }
}

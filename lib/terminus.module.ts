import { DynamicModule, Module, HttpModule } from '@nestjs/common';
import {
  TerminusModuleOptions,
  TerminusModuleAsyncOptions,
} from './terminus-module-options.interface';
import { TerminusCoreModule } from './terminus-core.module';
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
  imports: [HttpModule],
  providers: [
    DiskusageLibProvider,
    HealthCheckExecutor,
    HealthCheckService,
    ...HEALTH_INDICATORS,
  ],
  exports: [HealthCheckService, ...HEALTH_INDICATORS],
})
export class TerminusModule {
  /**
   * Bootstraps the Terminus Module synchronously
   * @param options The options for the Terminus Module
   * @deprecated
   */
  static forRoot(options?: TerminusModuleOptions): DynamicModule {
    return {
      module: TerminusModule,
      imports: [TerminusCoreModule.forRoot(options)],
    };
  }

  /**
   * Bootstrap the Terminus Module asynchronously
   * @param options The options for the Terminus module
   */
  static forRootAsync(options: TerminusModuleAsyncOptions): DynamicModule {
    return {
      module: TerminusModule,
      imports: [TerminusCoreModule.forRootAsync(options)],
    };
  }
}

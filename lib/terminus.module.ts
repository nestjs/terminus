import { DynamicModule, Module, HttpModule } from '@nestjs/common';
import {
  TerminusModuleOptions,
  TerminusModuleAsyncOptions,
} from './interfaces/terminus-module-options.interface';
import { TerminusCoreModule } from './terminus-core.module';
import { DiskusageLibProvider } from './health-indicators/disk/diskusage-lib.provider';
import { HEALTH_INDICATORS } from './health-indicators.provider';

/**
 *
 * Terminus Module which represents the integration of the
 * `@godaddy/terminus` module with the Nest ecosystem.
 *
 *
 * @publicApi
 */
@Module({
  imports: [HttpModule],
  providers: [DiskusageLibProvider, ...HEALTH_INDICATORS],
  exports: [...HEALTH_INDICATORS],
})
export class TerminusModule {
  /**
   * Bootstraps the Terminus Module synchronously
   * @param options The options for the Terminus Module
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

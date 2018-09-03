import { DynamicModule, Module } from '@nestjs/common';
import {
  TerminusModuleOptions,
  TerminusModuleAsyncOptions,
} from './interfaces/terminus-module-options.interface';
import { TerminusCoreModule } from './terminus-core.module';

/**
 * Terminus Module which represents the integration of the
 * @godaddy/terminus module with the Nest ecosystem.
 */
@Module({})
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

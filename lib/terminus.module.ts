import { DynamicModule, Module } from '@nestjs/common';
import {
  TerminusModuleOptions,
  TerminusModuleAsyncOptions,
} from './interfaces/terminus-module-options.interface';
import { TerminusCoreModule } from './terminus-core.module';

@Module({})
export class TerminusModule {
  static forRoot(options?: TerminusModuleOptions): DynamicModule {
    return {
      module: TerminusModule,
      imports: [TerminusCoreModule.forRoot(options)],
    };
  }

  static forRootAsync(options: TerminusModuleAsyncOptions): DynamicModule {
    return {
      module: TerminusModule,
      imports: [TerminusCoreModule.forRootAsync(options)],
    };
  }
}

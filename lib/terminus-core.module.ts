import {
  DynamicModule,
  Global,
  Inject,
  Module,
  Provider,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  TerminusModuleOptions,
  TerminusModuleAsyncOptions,
  TerminusOptionsFactory,
} from './interfaces/terminus-module-options.interface';
import { TERMINUS_MODULE_OPTIONS } from './terminus.constants';
import { TerminusBootstrapService } from './terminus-bootstrap.service';
import { TerminusLibProvider } from './terminus-lib.provider';
import { TerminusModule } from './terminus.module';

@Global()
@Module({})
export class TerminusCoreModule {
  constructor(
    @Inject(TERMINUS_MODULE_OPTIONS)
    private readonly options: TerminusModuleOptions,
    private readonly moduleRef: ModuleRef,
  ) {}

  static forRoot(options: TerminusModuleOptions = {}): DynamicModule {
    const terminusModuleOptions = {
      provide: TERMINUS_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: TerminusCoreModule,
      providers: [
        terminusModuleOptions,
        TerminusBootstrapService,
        TerminusLibProvider,
      ],
    };
  }

  static forRootAsync(options: TerminusModuleAsyncOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);
    return {
      module: TerminusModule,
      imports: options.imports,
      providers: [
        ...asyncProviders,
        TerminusBootstrapService,
        TerminusLibProvider,
      ],
    };
  }

  private static createAsyncProviders(
    options: TerminusModuleAsyncOptions,
  ): Provider[] {
    return [
      {
        provide: TERMINUS_MODULE_OPTIONS,
        useClass: options.useClass,
      },
    ];
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
        useClass: options.useClass,
      };
    }
    return {
      provide: TERMINUS_MODULE_OPTIONS,
      useFactory: async (optionsFactory: TerminusOptionsFactory) =>
        await optionsFactory.createTerminusOptions(),
      inject: [options.useExisting],
    };
  }
}

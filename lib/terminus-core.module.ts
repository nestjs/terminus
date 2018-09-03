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
/**
 * The internal Terminus Module which handles the integration
 * with the third party Terminus library and Nest
 */
export class TerminusCoreModule {
  constructor(
    @Inject(TERMINUS_MODULE_OPTIONS)
    private readonly options: TerminusModuleOptions,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Bootstrap the internal Terminus Module with the given options
   * synchronously and sets the correct providers
   * @param options The options to bootstrap the module synchronously
   */
  static forRoot(options: TerminusModuleOptions = {}): DynamicModule {
    const terminusModuleOptions = {
      provide: TERMINUS_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: TerminusCoreModule,
      providers: [
        terminusModuleOptions,
        TerminusLibProvider,
        TerminusBootstrapService,
      ],
    };
  }

  /**
   * Bootstraps the internal Terminus Module with the given
   * options asynchronously and sets the correct providers
   * @param options The options to bootstrap the module
   */
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
    if (options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
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
  }
}

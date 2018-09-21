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
import { TerminusRegistry } from './terminus-registry.service';

/**
 * The internal Terminus Module which handles the integration
 * with the third party Terminus library and Nest
 */
@Global()
@Module({
  providers: [TerminusRegistry, TerminusLibProvider, TerminusBootstrapService],
  exports: [TerminusRegistry],
})
export class TerminusCoreModule {
  constructor(
    @Inject(TERMINUS_MODULE_OPTIONS)
    private readonly options: TerminusModuleOptions,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Bootstraps the internal Terminus Module with the given options
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
        TerminusRegistry,
        terminusModuleOptions,
        TerminusLibProvider,
        TerminusBootstrapService,
      ],
      exports: [TerminusRegistry],
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
        TerminusRegistry,
        ...asyncProviders,
        TerminusBootstrapService,
        TerminusLibProvider,
      ],
      exports: [TerminusRegistry],
    };
  }

  /**
   * Returns the asynchrnous providers depending on the given module
   * options
   * @param options Options for the asynchrnous terminus module
   */
  private static createAsyncProviders(
    options: TerminusModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  /**
   * Returns the asynchrnous Terminus options providers depending on the
   * given module options
   * @param options Options for the asynchrnous terminus module
   */
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
    return {
      provide: TERMINUS_MODULE_OPTIONS,
      useFactory: async (optionsFactory: TerminusOptionsFactory) =>
        await optionsFactory.createTerminusOptions(),
      inject: [options.useClass],
    };
  }
}

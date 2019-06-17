import {
  DynamicModule,
  Global,
  Module,
  Provider,
  HttpModule,
  Type,
} from '@nestjs/common';
import {
  TerminusModuleOptions,
  TerminusModuleAsyncOptions,
  TerminusOptionsFactory,
} from './interfaces';
import { TERMINUS_MODULE_OPTIONS } from './terminus.constants';
import { TerminusBootstrapService } from './terminus-bootstrap.service';
import { TerminusLibProvider } from './terminus-lib.provider';
import { TerminusModule } from './terminus.module';
import { DiskusageLibProvider } from './health-indicators/disk/diskusage-lib.provider';
import { HEALTH_INDICATORS } from './health-indicators.provider';

/**
 * The internal Terminus Module which handles the integration
 * with the third party Terminus library and Nest
 *
 * @internal
 */
@Global()
@Module({})
export class TerminusCoreModule {
  /**
   * Bootstraps the internal Terminus Module with the given options
   * synchronously and sets the correct providers
   * @param options The options to bootstrap the module synchronously
   */
  static forRoot(options?: TerminusModuleOptions): DynamicModule {
    const terminusModuleOptions = {
      provide: TERMINUS_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: TerminusCoreModule,
      imports: [HttpModule],
      providers: [
        terminusModuleOptions,
        TerminusLibProvider,
        TerminusBootstrapService,
        DiskusageLibProvider,
        ...HEALTH_INDICATORS,
      ],
      exports: [...HEALTH_INDICATORS],
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
      imports: [...(options.imports || []), HttpModule],
      providers: [
        ...asyncProviders,
        TerminusBootstrapService,
        TerminusLibProvider,
        DiskusageLibProvider,
        ...HEALTH_INDICATORS,
      ],
      exports: [...HEALTH_INDICATORS],
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
    if (options.useFactory || options.useExisting) {
      return [this.createAsyncOptionsProvider(options)];
    }
    const useClass = options.useClass as Type<TerminusOptionsFactory>;
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: useClass,
        useClass,
        inject: [...(options.inject || [])],
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

    if (options.useClass || options.useExisting) {
      // Bug with TypeScript 3.5.2: https://github.com/microsoft/TypeScript/issues/31937
      const inject = [
        (options.useClass || options.useExisting) as Type<
          TerminusOptionsFactory
        >,
      ];
      return {
        provide: TERMINUS_MODULE_OPTIONS,
        useFactory: async (optionsFactory: TerminusOptionsFactory) =>
          await optionsFactory.createTerminusOptions(),
        inject,
      };
    }

    throw new Error();
  }
}

import { Logger, type Provider } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ERROR_LOGGER } from './health-check/error-logger/error-logger.provider';
import { JsonErrorLogger } from './health-check/error-logger/json-error-logger.service';
import { PrettyErrorLogger } from './health-check/error-logger/pretty-error-logger.service';
import { NOOP_LOGGER } from './health-check/logger/noop-logger';
import {
  type TerminusAsyncOptions,
  type TerminusModuleOptions,
  type TerminusOptionsFactory,
} from './terminus-options.interface';
import { TERMINUS_LOGGER, TERMINUS_MODULE_OPTIONS } from './terminus.constants';

export const createOptionsProvider = (
  options: TerminusModuleOptions = {},
): Provider => ({
  provide: TERMINUS_MODULE_OPTIONS,
  useValue: options,
});

export const createAsyncOptionsProvider = (
  options: TerminusAsyncOptions,
): Provider => {
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
    inject: [options.useExisting || options.useClass!],
  };
};

export const createTerminusProviders = (
  options?: TerminusModuleOptions,
): Provider[] => {
  return [
    {
      provide: ERROR_LOGGER,
      useFactory: (options: TerminusModuleOptions) => {
        switch (options.errorLogStyle) {
          case 'pretty':
            return new PrettyErrorLogger();
          default:
            return new JsonErrorLogger();
        }
      },
      inject: [TERMINUS_MODULE_OPTIONS],
    },
    createLoggerProvider(options),
  ];
};

function createLoggerProvider(options?: TerminusModuleOptions): Provider {
  // When options are known at registration time (forRoot / static @Module),
  // use static providers so NestJS resolves the logger through DI.
  if (options) {
    if (options.logger === false) {
      return { provide: TERMINUS_LOGGER, useValue: NOOP_LOGGER };
    }

    return {
      provide: TERMINUS_LOGGER,
      useClass:
        options.logger === true || options.logger === undefined
          ? Logger
          : options.logger,
    };
  }

  // When options are not known at registration time (forRootAsync),
  // resolve the logger dynamically at runtime.
  return {
    provide: TERMINUS_LOGGER,
    useFactory: async (opts: TerminusModuleOptions, moduleRef: ModuleRef) => {
      if (opts.logger === false) {
        return NOOP_LOGGER;
      }

      if (opts.logger === true || opts.logger === undefined) {
        return new Logger();
      }

      await Promise.resolve();

      return moduleRef.get(opts.logger, { strict: false });
    },
    inject: [TERMINUS_MODULE_OPTIONS, ModuleRef],
  };
}

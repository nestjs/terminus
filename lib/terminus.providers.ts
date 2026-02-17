import { Logger, type Provider } from '@nestjs/common';
import { ERROR_LOGGER } from './health-check/error-logger/error-logger.provider';
import { JsonErrorLogger } from './health-check/error-logger/json-error-logger.service';
import { PrettyErrorLogger } from './health-check/error-logger/pretty-error-logger.service';
import { NOOP_LOGGER } from './health-check/logger/noop-logger';
import {
  type TerminusAsyncOptions,
  type TerminusModuleOptions,
  type TerminusOptionsFactory,
} from './terminus-options.interface';
import { TERMINUS_MODULE_OPTIONS, TERMINUS_LOGGER } from './terminus.constants';

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
  _options: TerminusModuleOptions = {},
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
    {
      provide: TERMINUS_LOGGER,
      useFactory: (options: TerminusModuleOptions) => {
        if (options.logger === false) {
          return NOOP_LOGGER;
        }

        if (options.logger === true || options.logger === undefined) {
          return new Logger();
        }

        return new options.logger();
      },
      inject: [TERMINUS_MODULE_OPTIONS],
    },
  ];
};

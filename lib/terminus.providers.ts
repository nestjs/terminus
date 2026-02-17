import { Logger, Provider } from '@nestjs/common';
import {
  TerminusAsyncOptions,
  TerminusModuleOptions,
  TerminusOptionsFactory,
} from './terminus-options.interface';
import { TERMINUS_MODULE_OPTIONS } from './terminus.constants';
import { ERROR_LOGGER } from './health-check/error-logger/error-logger.provider';
import { PrettyErrorLogger } from './health-check/error-logger/pretty-error-logger.service';
import { JsonErrorLogger } from './health-check/error-logger/json-error-logger.service';
import { TERMINUS_LOGGER } from './terminus.constants';
import { NOOP_LOGGER } from './health-check/logger/noop-logger';

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

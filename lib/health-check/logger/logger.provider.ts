import { LoggerService, Provider, Type } from '@nestjs/common';
import { DefaultTerminusLogger } from './default-logger.service';

export const TERMINUS_LOGGER = 'TERMINUS_LOGGER';

export function getLoggerProvider(
  logger?: Type<LoggerService> | boolean,
): Provider<LoggerService> {
  if (logger === true || logger === undefined) {
    return {
      provide: TERMINUS_LOGGER,
      useClass: DefaultTerminusLogger,
    };
  }

  if (logger === false) {
    return {
      provide: TERMINUS_LOGGER,
      useValue: {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        log: () => {},
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        error: () => {},
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        warn: () => {},
      },
    };
  }

  return {
    provide: TERMINUS_LOGGER,
    useClass: logger,
  };
}

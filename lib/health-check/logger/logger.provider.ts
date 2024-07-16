import {
  Logger,
  type LoggerService,
  type Provider,
  type Type,
} from '@nestjs/common';

export const TERMINUS_LOGGER = 'TERMINUS_LOGGER';

const NOOP_LOGGER = {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  log: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  error: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  warn: () => {},
};

export function getLoggerProvider(
  logger?: Type<LoggerService> | boolean,
): Provider<LoggerService> {
  // Enable logging
  if (logger === true || logger === undefined) {
    return {
      provide: TERMINUS_LOGGER,
      useClass: Logger,
    };
  }

  // Disable logging
  if (logger === false) {
    return {
      provide: TERMINUS_LOGGER,
      useValue: NOOP_LOGGER,
    };
  }

  // Custom logger
  return {
    provide: TERMINUS_LOGGER,
    useClass: logger,
  };
}

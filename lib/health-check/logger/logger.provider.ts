import {
  Logger,
  type LoggerService,
  type Provider,
  type Type,
} from '@nestjs/common';
import { NOOP_LOGGER } from './noop-logger';
import { TERMINUS_LOGGER } from '../../terminus.constants';

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

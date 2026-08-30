import { type Provider } from '@nestjs/common';
import { type ErrorLogger } from './error-logger.interface.js';
import { JsonErrorLogger } from './json-error-logger.service.js';
import { PrettyErrorLogger } from './pretty-error-logger.service.js';
import { type ErrorLogStyle } from '../../terminus-options.interface.js';

export const ERROR_LOGGER = 'TERMINUS_ERROR_LOGGER';

export function getErrorLoggerProvider(
  errorLogStyle?: ErrorLogStyle,
): Provider<ErrorLogger> {
  switch (errorLogStyle) {
    case 'pretty':
      return {
        provide: ERROR_LOGGER,
        useClass: PrettyErrorLogger,
      };
    default:
      return {
        provide: ERROR_LOGGER,
        useClass: JsonErrorLogger,
      };
  }
}

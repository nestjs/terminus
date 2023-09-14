import { Provider } from '@nestjs/common';
import { ErrorLogger } from './error-logger.interface';
import { JsonErrorLogger } from './json-error-logger.service';
import { PrettyErrorLogger } from './pretty-error-logger.service';
import { ErrorLogStyle } from '../../terminus-options.interface';

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

import { type Type } from '@nestjs/common';
import { type ErrorLogger } from './error-logger.interface.js';
import { JsonErrorLogger } from './json-error-logger.service.js';
import { PrettyErrorLogger } from './pretty-error-logger.service.js';

export const ERROR_LOGGERS: Type<ErrorLogger>[] = [
  JsonErrorLogger,
  PrettyErrorLogger,
];

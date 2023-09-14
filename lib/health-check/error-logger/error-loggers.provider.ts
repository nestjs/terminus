import { type Type } from '@nestjs/common';
import { type ErrorLogger } from './error-logger.interface';
import { JsonErrorLogger } from './json-error-logger.service';
import { PrettyErrorLogger } from './pretty-error-logger.service';

export const ERROR_LOGGERS: Type<ErrorLogger>[] = [
  JsonErrorLogger,
  PrettyErrorLogger,
];

import { type LoggerService, type Type } from '@nestjs/common';

export type ErrorLogStyle = 'pretty' | 'json';

export interface TerminusModuleOptions {
  errorLogStyle?: ErrorLogStyle;
  logger?: Type<LoggerService> | boolean;
}

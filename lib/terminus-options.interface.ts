import { type LoggerService, type Type } from '@nestjs/common';

export type ErrorLogStyle = 'pretty' | 'json';

/**
 * The Terminus module options
 *
 * errorLogStyle: The style of the error logger. Either 'pretty' or 'json'. Default to 'json'.
 * logger: The logger to use. Either default logger or your own.
 * gracefulShutdownTimeoutMs: The timeout to wait in ms before the application shuts down. Default to 0ms.
 */
export interface TerminusModuleOptions {
  errorLogStyle?: ErrorLogStyle;
  logger?: Type<LoggerService> | boolean;
  gracefulShutdownTimeoutMs?: number;
}

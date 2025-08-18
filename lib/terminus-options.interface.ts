import { type LoggerService, type Type } from '@nestjs/common';

export type ErrorLogStyle = 'pretty' | 'json';

/**
 * The Terminus module options
 *
 * errorLogStyle: The style of the error logger. Either 'pretty' or 'json'. Default to 'json'.
 * logger: The logger to use. Either default logger or your own.
 * gracefulShutdownTimeoutMs: The timeout to wait in ms before the application shuts down. Default to 0ms.
 * @publicApi
 */
export interface TerminusModuleOptions {
  /**
   * The style of the error logger
   * @default 'json'
   */
  errorLogStyle?: ErrorLogStyle;
  /**
   * The logger to use. Either default logger or your own.
   */
  logger?: Type<LoggerService> | boolean;
  /**
   * The timeout to wait in ms before the application shuts down
   * @default 0
   */
  gracefulShutdownTimeoutMs?: number;

  /**
   * When true, all @HealthCheck() endpoints return 503 once shutdown begins.
   * Combine with gracefulShutdownTimeoutMs to drain traffic before closing.
   * Default: false
   */
  failReadinessOnShutdown?: boolean;
}

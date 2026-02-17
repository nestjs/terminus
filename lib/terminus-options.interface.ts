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
   * Enable enhanced graceful shutdown sequence for production environments
   * When enabled, the shutdown process will:
   * 1. Mark readiness probe as unhealthy
   * 2. Wait for load balancer to stop routing traffic
   * 3. Process remaining requests
   * 4. Close connections and shutdown
   * @default false
   */
  enableEnhancedShutdown?: boolean;
  /**
   * Time to wait (in ms) after marking readiness probe unhealthy
   * before starting the shutdown process.
   * This allows load balancers to detect and stop routing traffic.
   * Only used when enableEnhancedShutdown is true.
   * @default 15000
   */
  beforeShutdownDelayMs?: number;
}

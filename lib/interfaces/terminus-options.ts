export type HealthCheck = () => Promise<any>;

// TODO: Use terminus typings instead
// => https://github.com/godaddy/terminus/issues/75

/**
 * The mapping for the health check addresses
 * with the functions to be called
 */
export interface HealthCheckMap {
  /**
   * A health check
   * @example
   * { '/health': async () => true };
   */
  [key: string]: HealthCheck;
}

/**
 * The options for the Terminus library
 */
export interface TerminusOptions {
  /**
   * Object of health checks
   */
  healthChecks?: HealthCheckMap;
  /**
   * [optional = 1000] number of milliseconds before forcefull exiting
   */
  timeout?: number;
  /**
   * [optional = 'SIGTERM'] what signal to listen for relative to shutdown
   */
  signal?: string;
  /**
   * [optional = []] array of signals to listen for relative to shutdown
   */
  signals?: string[];
  /**
   * [optional] called before the HTTP server starts its shutdown
   */
  beforeShutdown?: () => Promise<any>;
  /**
   * [optional] cleanup function, returning a promise (used to be onSigterm)
   */
  onSignal?: () => Promise<any>;
  /**
   * [optional] called right before exiting
   */
  onShutdown?: () => Promise<any>;
  /**
   * [optional] logger function to be called with errors
   */
  logger?: (msg: string, err: Error) => void;
}

export type HealthCheck = () => Promise<any>;

/**
 * TODO: Use terminus typings instead
 */

export interface HealthCheckMap {
  [key: string]: HealthCheck;
}

export interface TerminusOptions {
  healthChecks?: HealthCheckMap;
  timeout?: number;
  signal?: string;
  signals?: string[];
  onSignal?: () => Promise<any>;
  onShutdown?: () => Promise<any>;
  logger?: (msg: string, err: Error) => void;

  /** Deprecated. */
  onSigterm?: () => Promise<any>;
}

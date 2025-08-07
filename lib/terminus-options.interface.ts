import {
  type LoggerService,
  type ModuleMetadata,
  type Type,
} from '@nestjs/common';

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
}

/**
 * Options factory interface for creating TerminusModuleOptions
 * @publicApi
 */
export interface TerminusModuleOptionsFactory {
  createTerminusOptions():
    | Promise<TerminusModuleOptions>
    | TerminusModuleOptions;
}

/**
 * Async options for TerminusModule
 * @publicApi
 */
export interface TerminusModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  /**
   * Factory function that returns TerminusModuleOptions
   */
  useFactory?: (
    ...args: any[]
  ) => Promise<TerminusModuleOptions> | TerminusModuleOptions;
  /**
   * Dependencies to inject into the factory function
   */
  inject?: any[];
  /**
   * Class to use as options factory
   */
  useClass?: Type<TerminusModuleOptionsFactory>;
  /**
   * Existing instance to use as options factory
   */
  useExisting?: Type<TerminusModuleOptionsFactory>;
}

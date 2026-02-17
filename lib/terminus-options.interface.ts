import { type LoggerService, type Type } from '@nestjs/common';
import { type ModuleMetadata } from '@nestjs/common';

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
 * Interface for a factory that creates TerminusModuleOptions.
 * @publicApi
 */
export interface TerminusOptionsFactory {
  createTerminusOptions():
    | Promise<TerminusModuleOptions>
    | TerminusModuleOptions;
}

/**
 * Options for asynchronous registration of the Terminus module.
 * @publicApi
 */
export interface TerminusAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  /**
   * The `useExisting` syntax allows you to create aliases for existing providers.
   */
  useExisting?: Type<TerminusOptionsFactory>;
  /**
   * The `useClass` syntax allows you to dynamically determine a class
   * that a token should resolve to.
   */
  useClass?: Type<TerminusOptionsFactory>;
  /**
   * The `useFactory` syntax allows for creating providers dynamically.
   */
  useFactory?: (
    ...args: any[]
  ) => Promise<TerminusModuleOptions> | TerminusModuleOptions;
  /**
   * Optional list of providers to be injected into the context of the Factory function.
   */
  inject?: any[];
}

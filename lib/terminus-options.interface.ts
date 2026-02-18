import {
  type LoggerService,
  type Type,
  type ModuleMetadata,
} from '@nestjs/common';

export type ErrorLogStyle = 'pretty' | 'json';

/**
 * The Terminus module options
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
 * The Terminus module options for asynchronous registration.
 */
export type TerminusAsyncModuleOptions = Omit<
  TerminusModuleOptions,
  'logger'
> & {
  /**
   * A resolved logger instance, or a boolean.
   * Pass `false` to disable logging, `true` for the default NestJS logger,
   * or an already-instantiated LoggerService.
   */
  logger?: LoggerService | boolean;
};

/**
 * Interface for a factory that creates TerminusModuleOptions.
 * @publicApi
 */
export interface TerminusOptionsFactory {
  createTerminusOptions():
    | Promise<TerminusAsyncModuleOptions>
    | TerminusAsyncModuleOptions;
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
  ) => Promise<TerminusAsyncModuleOptions> | TerminusAsyncModuleOptions;
  /**
   * Optional list of providers to be injected into the context of the Factory function.
   */
  inject?: any[];
}

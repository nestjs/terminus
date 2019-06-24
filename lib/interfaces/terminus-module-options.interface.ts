import { Type } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common/interfaces';
import { HealthIndicatorFunction } from './health-indicator.interface';
import { HealthCheckError } from '@godaddy/terminus';

/**
 * The logger which will be used inside the terminus application
 * to log errors or messages
 * 
 * @publicApi
 */
export type TerminusLogger = (
  message: any,
  error?: HealthCheckError | Error,
) => any;

/**
 * Represents one endpoint / health check
 * 
 * @publicApi
 */
export interface TerminusEndpoint {
  /**
   * The url of the endpoint / health check
   */
  url: string;
  /**
   * The health checks which should get executed.
   */
  healthIndicators: HealthIndicatorFunction[];
}

/**
 * The options of the terminus module
 * 
 * @publicApi
 */
export interface TerminusModuleOptions {
  /**
   * A list of endpoints
   */
  endpoints: TerminusEndpoint[];

  logger?: TerminusLogger;
}

/**
 * The interface for the factory which provides the Terminus options
 * 
 * @publicApi
 */
export interface TerminusOptionsFactory {
  /**
   * The function which returns the Terminus Options
   */
  createTerminusOptions():
    | Promise<TerminusModuleOptions>
    | TerminusModuleOptions;
}

/**
 * The options f$r the asynchronous Terminus module creation
 * 
 * @publicApi
 */
export interface TerminusModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  /**
   * The name of the module
   */
  name?: string;
  /**
   * The class which should be used to provide the Terminus options
   */
  useClass?: Type<TerminusOptionsFactory>;
  /**
   * Import existing providers from other module
   */
  useExisting?: Type<TerminusOptionsFactory>;
  /**
   * The factory which should be used to provide the Terminus options
   */
  useFactory?: (
    ...args: any[]
  ) => Promise<TerminusModuleOptions> | TerminusModuleOptions;
  /**
   * The providers which should get injected
   */
  inject?: any[];
}

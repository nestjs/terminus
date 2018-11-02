import { Type } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common/interfaces';
import { HealthIndicatorFunction } from './health-indicator.interface';

/**
 * Represents one endpoint / health check
 */
export interface TerminusEndpoints {
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
 */
export interface TerminusModuleOptions {
  /**
   * A list of endpoints
   */
  endpoints: TerminusEndpoints[];
}

/**
 * The interface for the factory which provides the Terminus options
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
 * The options for the asynchronous Terminus module creation
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

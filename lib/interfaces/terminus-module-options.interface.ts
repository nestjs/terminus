import { Type } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common/interfaces';
import { TerminusOptions } from './terminus-options';

export type TerminusModuleOptions = TerminusOptions;

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
  useClass?: Type<TerminusModuleOptions>;
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

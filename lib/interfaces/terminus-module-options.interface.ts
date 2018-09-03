import { Type } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common/interfaces';
import { TerminusOptions } from './terminus-options';

export type TerminusModuleOptions = TerminusOptions;

export interface TerminusOptionsFactory {
  createTerminusOptions():
    | Promise<TerminusModuleOptions>
    | TerminusModuleOptions;
}

export interface TerminusModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  name?: string;
  useClass?: Type<TerminusModuleOptions>;
  useFactory?: (
    ...args: any[]
  ) => Promise<TerminusModuleOptions> | TerminusModuleOptions;
  inject?: any[];
}

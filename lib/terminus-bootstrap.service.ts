import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { TERMINUS_MODULE_OPTIONS, TERMINUS_LIB } from './terminus.constants';
import { TerminusModuleOptions } from './interfaces';
import { HTTP_SERVER_REF } from '@nestjs/core';
import { Server } from 'http';
import { TerminusOptions } from './interfaces/terminus-options';

/**
 * Bootstraps the third party Terminus library with the
 * configured Module options
 */
@Injectable()
export class TerminusBootstrapService implements OnModuleInit {
  /**
   * The http server of NestJS
   */
  private httpServer: Server;
  /**
   * Intiailizes the service
   * @param options The terminus module options
   * @param httpAdapter The http adapter from NestJS which will be used for the terminus instance
   * @param terminus The terminus instance
   */
  constructor(
    @Inject(TERMINUS_MODULE_OPTIONS)
    private readonly options: TerminusModuleOptions,
    @Inject(HTTP_SERVER_REF) private readonly httpAdapter,
    @Inject(TERMINUS_LIB) private readonly terminus,
  ) {}

  /**
   * Bootstraps the third party terminus library with
   * the given module options
   */
  private bootstrapTerminus() {
    this.terminus(this.httpServer, this.options);
  }

  /**
   * Gets called when the Module gets initialized.
   */
  onModuleInit() {
    this.httpServer = this.httpAdapter.getHttpServer();
    this.bootstrapTerminus();
  }
}

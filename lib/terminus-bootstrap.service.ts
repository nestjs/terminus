import { Injectable, Inject, OnModuleInit, HttpServer } from '@nestjs/common';
import { TERMINUS_MODULE_OPTIONS, TERMINUS_LIB } from './terminus.constants';
import { TerminusModuleOptions } from './interfaces';
import { HTTP_SERVER_REF } from '@nestjs/core';
import { Server } from 'http';
import { Terminus } from '@godaddy/terminus';

/**
 * Bootstraps the third party Terminus library with the
 * configured Module options
 */
@Injectable()
export class TerminusBootstrapService implements OnModuleInit {
  /**
   * Intiailizes the service
   * @param options The terminus module options
   * @param httpAdapter The http adapter from NestJS which will be used for the terminus instance
   * @param terminus The terminus instance
   */
  constructor(
    @Inject(TERMINUS_MODULE_OPTIONS)
    private readonly options: TerminusModuleOptions,
    @Inject(HTTP_SERVER_REF) private readonly httpAdapter: HttpServer,
    @Inject(TERMINUS_LIB) private readonly terminus: Terminus,
  ) {}

  /**
   * Gets called when the Module gets initialized.
   *
   * Bootstraps the third party terminus library with
   * the given module options
   */
  public onModuleInit() {
    const httpServer: HttpServer = this.httpAdapter.getHttpServer();
    this.terminus(httpServer, this.options);
  }
}

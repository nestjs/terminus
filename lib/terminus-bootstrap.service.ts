import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { TERMINUS_MODULE_OPTIONS, TERMINUS_LIB } from './terminus.constants';
import { TerminusModuleOptions } from './interfaces';
import { HTTP_SERVER_REF, FastifyAdapter } from '@nestjs/core';
import { Server } from 'http';
import { TerminusOptions } from './interfaces/terminus-options';

@Injectable()
export class TerminusBootstrapService implements OnModuleInit {
  private httpServer: Server;
  constructor(
    @Inject(TERMINUS_MODULE_OPTIONS)
    private readonly options: TerminusModuleOptions,
    @Inject(HTTP_SERVER_REF) private readonly httpAdapter,
    @Inject(TERMINUS_LIB) private readonly terminus,
  ) {}
  onModuleInit() {
    this.httpServer = this.httpAdapter.getHttpServer();
    this.terminus(this.httpServer, this.options);
  }
}

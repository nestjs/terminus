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
    @Inject(HTTP_SERVER_REF) private readonly httpAdapter: any,
    @Inject(TERMINUS_LIB) private readonly terminus,
  ) {
    const adapter = this.httpAdapter.getInstance();
    // Fastify
    if (adapter.server) {
      this.httpServer = adapter.server;
    }
  }

  onModuleInit() {
    console.log(this.options);
    this.terminus(this.httpServer, this.options);
  }
}

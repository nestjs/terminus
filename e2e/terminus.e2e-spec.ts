import { INestApplication, DynamicModule } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TerminusModule } from '../lib/terminus.module';
import { TerminusOptions } from '../lib/interfaces/terminus-options';
import { async } from 'rxjs/internal/scheduler/async';
import { TerminusBootstrapService } from '../lib/terminus-bootstrap.service';
import { TerminusLibProvider } from '../lib/terminus-lib.provider';
import { HTTP_SERVER_REF } from '@nestjs/core';
import { TerminusModuleAsyncOptions } from '../lib/interfaces';

describe('Terminus', () => {
  let app: INestApplication;
  let terminusLibProvider = jest.fn();
  let httpServer = {};
  let httpServerAdapter = {
    getHttpServer: () => httpServer,
  };
  let terminusOptions: TerminusOptions = {
    healthChecks: {
      '/health': async () => true,
    },
  };

  async function bootstrapModule(options: DynamicModule) {
    const module = await Test.createTestingModule({
      imports: [options],
    })
      .overrideProvider(TerminusLibProvider.provide)
      .useValue(terminusLibProvider)
      .overrideProvider(HTTP_SERVER_REF)
      .useValue(httpServerAdapter)
      .compile();

    app = module.createNestApplication();
    await app.init();
    return app;
  }

  it('should correctly call Terminus with useFactory', async () => {
    await bootstrapModule(
      TerminusModule.forRootAsync({
        useFactory: async (): Promise<TerminusOptions> => terminusOptions,
      }),
    );
    expect(terminusLibProvider).toHaveBeenCalledWith(
      httpServer,
      terminusOptions,
    );
  });

  it('should correctly call Terminus with useClass', async () => {
    const onShutdown = async () => {
      return 'working';
    };
    class TerminusService implements TerminusOptions {
      public onShutdown = onShutdown;
    }

    app = await bootstrapModule(
      TerminusModule.forRootAsync({
        useClass: TerminusService,
      }),
    );

    expect(terminusLibProvider).toHaveBeenCalledWith(httpServer, {
      onShutdown,
    });
  });

  it('should correctly call Terminus with synchronous forRoot', async () => {
    app = await bootstrapModule(TerminusModule.forRoot(terminusOptions));

    expect(terminusLibProvider).toHaveBeenCalledWith(
      httpServer,
      terminusOptions,
    );
  });
});

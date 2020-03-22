import { INestApplication, DynamicModule } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TerminusModule } from '../lib/terminus.module';
import { SIG_NOT_EXIST } from '../lib/terminus-bootstrap.service';
import { TerminusLibProvider } from '../lib/terminus-lib.provider';
import { HttpAdapterHost } from '@nestjs/core';
import { TerminusOptionsFactory, TerminusModuleOptions } from '../';
import { TerminusOptions } from '@godaddy/terminus';

describe('Terminus', () => {
  let app: INestApplication;
  let terminusLibProvider = jest.fn();
  let httpServer = {};
  let terminusOptions: TerminusOptions = {
    healthChecks: {
      '/health': expect.any(Function),
    },
    logger: expect.any(Function),
    signal: SIG_NOT_EXIST,
  };

  let terminusModuleOptions: TerminusModuleOptions = {
    endpoints: [
      {
        url: '/health',
        healthIndicators: [
          async () => ({ db: { whatever: true, status: 'up' } }),
        ],
      },
    ],
  };

  async function bootstrapModule(options: DynamicModule) {
    const module = await Test.createTestingModule({
      imports: [options],
    })
      .overrideProvider(TerminusLibProvider.provide)
      .useValue(terminusLibProvider)
      .compile();

    app = module.createNestApplication();
    httpServer = app
      .get<HttpAdapterHost>(HttpAdapterHost)
      .httpAdapter.getHttpServer();
    await app.init();
    return app;
  }

  it('should correctly call Terminus with useFactory', async () => {
    await bootstrapModule(
      TerminusModule.forRootAsync({
        useFactory: () => terminusModuleOptions,
      }),
    );
    expect(terminusLibProvider).toHaveBeenCalledWith(
      httpServer,
      terminusOptions,
    );
  });

  it('should correctly call Terminus with useClass', async () => {
    class TerminusService implements TerminusOptionsFactory {
      createTerminusOptions(): TerminusModuleOptions {
        return terminusModuleOptions;
      }
    }

    app = await bootstrapModule(
      TerminusModule.forRootAsync({
        useClass: TerminusService,
      }),
    );

    expect(terminusLibProvider).toHaveBeenCalledWith(
      httpServer,
      terminusOptions,
    );
  });
});

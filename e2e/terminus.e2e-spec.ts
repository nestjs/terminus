import { INestApplication, DynamicModule } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TerminusModule } from '../lib/terminus.module';
import { TerminusLibProvider } from '../lib/terminus-lib.provider';
import { HTTP_SERVER_REF } from '@nestjs/core';
import {
  TerminusModuleAsyncOptions,
  TerminusOptionsFactory,
  TerminusModuleOptions,
} from '../lib/interfaces';
import { TerminusOptions } from '@godaddy/terminus';

describe('Terminus', () => {
  let app: INestApplication;
  let terminusLibProvider = jest.fn();
  let httpServer = {};
  let httpServerAdapter = {
    getHttpServer: () => httpServer,
  };
  let terminusOptions: TerminusOptions = {
    healthChecks: {
      '/health': expect.any(Function),
    },
  };

  let terminusModuleOptions: TerminusModuleOptions = {
    endpoints: [
      {
        url: '/health',
        healthIndicators: [async () => ({ key: true })],
      },
    ],
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

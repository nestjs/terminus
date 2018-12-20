import { INestApplication, DynamicModule } from '@nestjs/common';
import {
  TerminusModuleAsyncOptions,
  TerminusModule,
  TerminusModuleOptions,
} from '../lib';
import { NestFactory, FastifyAdapter } from '@nestjs/core';

import { TypeOrmModule } from '@nestjs/typeorm';
import Axios from 'axios';
import { HealthCheckError } from '@godaddy/terminus';

describe('Fastify', () => {
  let app: INestApplication;
  const PORT = process.env.PORT || 3001;

  class ApplicationModule {
    static forRoot(options: TerminusModuleAsyncOptions): DynamicModule {
      return {
        module: ApplicationModule,
        imports: [TerminusModule.forRootAsync(options)],
      };
    }
  }

  async function bootstrapModule(options: TerminusModuleAsyncOptions) {
    app = await NestFactory.create(
      ApplicationModule.forRoot(options),
      new FastifyAdapter(),
    );
    await app.listen(PORT);
  }

  it('should run health checks with a fastify adapter', async () => {
    await bootstrapModule({
      useFactory: (): TerminusModuleOptions => ({
        endpoints: [
          {
            url: '/health',
            healthIndicators: [
              async () => ({
                test: {
                  status: 'up',
                },
              }),
            ],
          },
        ],
      }),
    });

    const response = await Axios.get(`http://0.0.0.0:${PORT}/health`, {});
    expect(response).toEqual({
      status: 'ok',
      info: { test: { status: 'up' } },
    });
  });

  afterEach(async () => {
    await app.close();
  });
});

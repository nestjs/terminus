import { INestApplication } from '@nestjs/common';
import { TerminusModuleOptions, TerminusEndpoint } from '../lib';

import Axios from 'axios';
import { bootstrapModule } from './helper/bootstrap-module';

describe('Fastify', () => {
  let app: INestApplication;
  let port: number;

  it('should run health checks with a fastify adapter', async done => {
    const info = { test: { status: 'up' } };

    const endpoints: TerminusEndpoint[] = [
      {
        url: '/health',
        healthIndicators: [async () => info],
      },
    ];

    [app, port] = await bootstrapModule(
      {
        useFactory: (): TerminusModuleOptions => ({ endpoints }),
      },
      false,
      true,
    );

    // Workaraound to wait until module is bootsrapped
    setTimeout(async () => {
      const response = await Axios.get(`http://0.0.0.0:${port}/health`);
      expect(response.data).toEqual({ status: 'ok', info });
      done();
    }, 40);
  });

  afterEach(async () => await app.close());
});

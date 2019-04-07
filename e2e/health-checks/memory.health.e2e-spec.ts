import { INestApplication } from '@nestjs/common';

import Axios from 'axios';
import { MemoryHealthIndicator, TerminusModuleOptions } from '../../lib';
import { bootstrapModule } from '../helper/bootstrap-module';

describe('Memory Health', () => {
  let app: INestApplication;
  let port: number;
  let getTerminusOptions: (
    disk: MemoryHealthIndicator,
  ) => TerminusModuleOptions;
  beforeEach(async () => {
    getTerminusOptions = (
      disk: MemoryHealthIndicator,
    ): TerminusModuleOptions => ({
      endpoints: [
        {
          url: '/health',
          healthIndicators: [
            async () => {
              const { heapUsed } = process.memoryUsage();
              return disk.check('memory', { threshold: heapUsed + 1 });
            },
          ],
        },
      ],
    });
  });

  it('should check if the memory threshold is not exceeded', async () => {
    [app, port] = await bootstrapModule({
      inject: [MemoryHealthIndicator],
      useFactory: getTerminusOptions,
    });
    const response = await Axios.get(`http://0.0.0.0:${port}/health`);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      status: 'ok',
      info: { memory: { status: 'up' } },
    });
  });

  it('should check if correctly displays a threshold exceeded error', async () => {
    [app, port] = await bootstrapModule({
      inject: [MemoryHealthIndicator],
      useFactory: (disk: MemoryHealthIndicator): TerminusModuleOptions => ({
        endpoints: [
          {
            url: '/health',
            healthIndicators: [
              async () => disk.check('disk', { threshold: 0 }),
            ],
          },
        ],
      }),
    });

    try {
      await Axios.get(`http://0.0.0.0:${port}/health`);
    } catch (error) {
      expect(error.response.status).toBe(503);
      expect(error.response.data).toEqual({
        status: 'error',
        error: { disk: { status: 'down', message: expect.any(String) } },
      });
    }
  });

  afterEach(async () => await app.close());
});

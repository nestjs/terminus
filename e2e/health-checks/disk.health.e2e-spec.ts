import { INestApplication } from '@nestjs/common';

import Axios from 'axios';
import { DiskHealthIndicator, TerminusModuleOptions } from '../../lib';
import { bootstrapModule } from '../helper/bootstrap-module';
import * as checkDiskSpace from 'check-disk-space';

describe('Disk Health', () => {
  let app: INestApplication;
  let port: number;
  let getTerminusOptions: (disk: DiskHealthIndicator) => TerminusModuleOptions;
  beforeEach(async () => {
    const { free } = await checkDiskSpace('/');
    getTerminusOptions = (
      disk: DiskHealthIndicator,
    ): TerminusModuleOptions => ({
      endpoints: [
        {
          url: '/health',
          healthIndicators: [
            async () =>
              disk.checkStorage('disk', { path: '/', threshold: free + 1 }),
          ],
        },
      ],
    });
  });

  it('should check if the disk threshold is not exceeded', async () => {
    [app, port] = await bootstrapModule({
      inject: [DiskHealthIndicator],
      useFactory: getTerminusOptions,
    });
    const response = await Axios.get(`http://0.0.0.0:${port}/health`);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      status: 'ok',
      info: { disk: { status: 'up' } },
    });
  });

  it('should check if correctly displays a threshold exceeded error', async () => {
    [app, port] = await bootstrapModule({
      inject: [DiskHealthIndicator],
      useFactory: (disk: DiskHealthIndicator): TerminusModuleOptions => ({
        endpoints: [
          {
            url: '/health',
            healthIndicators: [
              async () =>
                disk.checkStorage('disk', { path: '/', threshold: 0 }),
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

  it('should check if the disk threshold is not exceeded using thresholdPercent', async () => {
    const { free, size } = await checkDiskSpace('/');
    const thresholdPercent = (size - free) / size;
    [app, port] = await bootstrapModule({
      inject: [DiskHealthIndicator],
      useFactory: (disk: DiskHealthIndicator): TerminusModuleOptions => ({
        endpoints: [
          {
            url: '/health',
            healthIndicators: [
              async () =>
                disk.checkStorage('disk', { path: '/', thresholdPercent }),
            ],
          },
        ],
      }),
    });
  });

  afterEach(async () => await app.close());
});

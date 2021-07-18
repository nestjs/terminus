import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import * as checkDiskSpace from 'check-disk-space';

import { bootstrapTestingModule, DynamicHealthEndpointFn } from '../helper';

describe('DiskHealthIndicator', () => {
  let app: INestApplication;
  let setHealthEndpoint: DynamicHealthEndpointFn;

  beforeEach(
    () => (setHealthEndpoint = bootstrapTestingModule().setHealthEndpoint),
  );

  describe('#checkStorage', () => {
    it('should check if the disk threshold has not exceeded', async () => {
      const { free, size } = await checkDiskSpace('/');
      app = await setHealthEndpoint(({ healthCheck, disk }) =>
        healthCheck.check([
          () =>
            disk.checkStorage('disk', {
              path: '/',
              threshold: size - free + 90000,
            }),
        ]),
      ).start();

      const details = { disk: { status: 'up' } };

      return request(app.getHttpServer()).get('/health').expect(200).expect({
        status: 'ok',
        info: details,
        error: {},
        details,
      });
    });

    it('should check if correctly displays a threshold exceeded error', async () => {
      app = await setHealthEndpoint(({ healthCheck, disk }) =>
        healthCheck.check([
          () => disk.checkStorage('disk', { path: '/', threshold: 0 }),
        ]),
      ).start();

      const details = {
        disk: {
          status: 'down',
          message: 'Used disk storage exceeded the set threshold',
        },
      };

      return request(app.getHttpServer()).get('/health').expect(503).expect({
        status: 'error',
        info: {},
        error: details,
        details,
      });
    });

    it('should check if the disk thresholdPercent has not exceeded', async () => {
      const { free, size } = await checkDiskSpace('/');
      const thresholdPercent = (size - free) / size;
      app = await setHealthEndpoint(({ healthCheck, disk }) =>
        healthCheck.check([
          async () =>
            disk.checkStorage('disk', {
              path: '/',
              thresholdPercent: thresholdPercent + 0.2,
            }),
        ]),
      ).start();

      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect({
          status: 'ok',
          info: { disk: { status: 'up' } },
          error: {},
          details: { disk: { status: 'up' } },
        });
    });

    it('should check if correctly displays a thresholdPercent exceeded error', async () => {
      const { free, size } = await checkDiskSpace('/');
      const thresholdPercent = (size - free) / size;
      app = await setHealthEndpoint(({ healthCheck, disk }) =>
        healthCheck.check([
          async () =>
            disk.checkStorage('disk', {
              path: '/',
              thresholdPercent: thresholdPercent - 0.2,
            }),
        ]),
      ).start();

      const details = {
        disk: {
          status: 'down',
          message: 'Used disk storage exceeded the set threshold',
        },
      };

      return request(app.getHttpServer()).get('/health').expect(503).expect({
        status: 'error',
        info: {},
        error: details,
        details,
      });
    });
  });

  afterEach(async () => await app.close());
});

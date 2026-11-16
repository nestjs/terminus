import { type INestApplication } from '@nestjs/common';
import { checkDiskSpace } from '../../lib/health-indicator/disk/disk-usage-lib.provider.js';
import request from 'supertest';
import {
  bootstrapTestingModule,
  type DynamicHealthEndpointFn,
} from '../helper/index.js';

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
              threshold: size - free + 1024 * 1024 * 1024,
            }),
        ]),
      ).start();

      const details = {
        disk: { status: 'up', responseTime: expect.any(Number) },
      };

      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect(({ body }) =>
          expect(body).toEqual({
            status: 'ok',
            info: details,
            error: {},
            details,
          }),
        );
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
          responseTime: expect.any(Number),
        },
      };

      return request(app.getHttpServer())
        .get('/health')
        .expect(503)
        .expect(({ body }) =>
          expect(body).toEqual({
            status: 'error',
            info: {},
            error: details,
            details,
          }),
        );
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
        .expect(({ body }) =>
          expect(body).toEqual({
            status: 'ok',
            info: { disk: { status: 'up', responseTime: expect.any(Number) } },
            error: {},
            details: {
              disk: { status: 'up', responseTime: expect.any(Number) },
            },
          }),
        );
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
          responseTime: expect.any(Number),
        },
      };

      return request(app.getHttpServer())
        .get('/health')
        .expect(503)
        .expect(({ body }) =>
          expect(body).toEqual({
            status: 'error',
            info: {},
            error: details,
            details,
          }),
        );
    });
  });

  describe('#checkStorage builders', () => {
    it('should be down, not a 500, when the path does not exist', async () => {
      app = await setHealthEndpoint(({ healthCheck, disk }) =>
        healthCheck.check([
          () =>
            disk.checkStorage('disk', {
              path: '/does/not/exist',
              threshold: 1,
            }),
        ]),
      ).start();

      return request(app.getHttpServer())
        .get('/health')
        .expect(503)
        .expect(({ body }) =>
          expect(body.details.disk).toEqual({
            status: 'down',
            message: expect.stringContaining('ENOENT'),
            responseTime: expect.any(Number),
          }),
        );
    });
  });

  afterEach(async () => await app.close());
});

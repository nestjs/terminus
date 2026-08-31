import { setTimeout } from 'node:timers/promises';
import { type INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import {
  bootstrapTestingModule,
  type DynamicHealthEndpointFn,
} from '../helper/index.js';

describe('TypeOrmHealthIndicator', () => {
  let app: INestApplication;
  let setHealthEndpoint: DynamicHealthEndpointFn;

  beforeEach(
    () =>
      (setHealthEndpoint =
        bootstrapTestingModule().withTypeOrm().setHealthEndpoint),
  );

  describe('#pingCheck', () => {
    it('should check if the typeorm is available', async () => {
      app = await setHealthEndpoint(({ healthCheck, typeorm }) =>
        healthCheck.check([async () => typeorm.pingCheck('typeorm')]),
      ).start();

      const details = {
        typeorm: { status: 'up', responseTime: expect.any(Number) },
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

    it('should throw an error if runs into timeout error', async () => {
      app = await setHealthEndpoint(({ healthCheck, typeorm }) =>
        healthCheck.check([
          async () => {
            // A real `SELECT 1` on localhost can finish inside 1ms, so keep
            // the real data source but hold its answer until the timer wins.
            const real = app.get(DataSource);
            const connection = Object.create(real);
            connection.query = (...args: unknown[]) =>
              real
                .query(...(args as [string]))
                .then((result) => setTimeout(50, result));
            return typeorm.pingCheck('typeorm', { timeout: 1, connection });
          },
        ]),
      ).start();

      const details = {
        typeorm: {
          status: 'down',
          message: 'timeout of 1ms exceeded',
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

  afterEach(async () => await app.close());
});

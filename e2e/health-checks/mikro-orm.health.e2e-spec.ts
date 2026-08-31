import { setTimeout } from 'node:timers/promises';
import { MikroORM } from '@mikro-orm/core';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  bootstrapTestingModule,
  type DynamicHealthEndpointFn,
} from '../helper/index.js';

describe('MikroOrmHealthIndicator', () => {
  let app: INestApplication;
  let setHealthEndpoint: DynamicHealthEndpointFn;

  describe('mongo', () => {
    beforeEach(
      () =>
        (setHealthEndpoint = bootstrapTestingModule()
          .withMikroOrm()
          .andMongo().setHealthEndpoint),
    );

    describe('#pingCheck', () => {
      it('should check if the mikroOrm is available', async () => {
        app = await setHealthEndpoint(({ healthCheck, mikroOrm }) =>
          healthCheck.check([async () => mikroOrm.pingCheck('mikroOrm')]),
        ).start();
        const details = {
          mikroOrm: { status: 'up', responseTime: expect.any(Number) },
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
    });
  });

  describe('mysql', () => {
    beforeEach(
      () =>
        (setHealthEndpoint = bootstrapTestingModule()
          .withMikroOrm()
          .andMysql().setHealthEndpoint),
    );

    describe('#pingCheck', () => {
      it('should check if the mikroOrm is available', async () => {
        app = await setHealthEndpoint(({ healthCheck, mikroOrm }) =>
          healthCheck.check([async () => mikroOrm.pingCheck('mikroOrm')]),
        ).start();
        const details = {
          mikroOrm: { status: 'up', responseTime: expect.any(Number) },
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
        app = await setHealthEndpoint(({ healthCheck, mikroOrm }) =>
          healthCheck.check([
            async () => {
              // A real `select 1` on localhost can finish inside 1ms, so keep
              // the real connection but hold its answer until the timer wins.
              const real = app.get(MikroORM).em.getConnection();
              const connection = Object.create(real);
              connection.isConnected = () =>
                real.isConnected().then((result) => setTimeout(50, result));
              return mikroOrm.pingCheck('mikroOrm', { timeout: 1, connection });
            },
          ]),
        ).start();

        const details = {
          mikroOrm: {
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

      it('should indicate that mikroOrm is down if the connection has been closed after startup', async () => {
        app = await setHealthEndpoint(({ healthCheck, mikroOrm }) =>
          healthCheck.check([async () => mikroOrm.pingCheck('mikroOrm')]),
        ).start();

        const up = {
          mikroOrm: {
            status: 'up',
            responseTime: expect.any(Number),
          },
        };

        request(app.getHttpServer())
          .get('/health')
          .expect(200)
          .expect(({ body }) =>
            expect(body).toEqual({
              status: 'ok',
              info: up,
              error: {},
              details: up,
            }),
          );

        const orm = app.get(MikroORM);
        await orm.close();

        const down = {
          mikroOrm: {
            status: 'down',
            message: 'Not connected to database',
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
              error: down,
              details: down,
            }),
          );
      });
    });
  });

  afterEach(async () => await app.close());
});

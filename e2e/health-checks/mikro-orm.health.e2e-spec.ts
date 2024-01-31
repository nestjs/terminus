import { MikroORM } from '@mikro-orm/core';
import { type INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  bootstrapTestingModule,
  type DynamicHealthEndpointFn,
} from '../helper';

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
        const details = { mikroOrm: { status: 'up' } };
        return request(app.getHttpServer()).get('/health').expect(200).expect({
          status: 'ok',
          info: details,
          error: {},
          details,
        });
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
        const details = { mikroOrm: { status: 'up' } };
        return request(app.getHttpServer()).get('/health').expect(200).expect({
          status: 'ok',
          info: details,
          error: {},
          details,
        });
      });

      it('should throw an error if runs into timeout error', async () => {
        app = await setHealthEndpoint(({ healthCheck, mikroOrm }) =>
          healthCheck.check([
            async () => mikroOrm.pingCheck('mikroOrm', { timeout: 1 }),
          ]),
        ).start();

        const details = {
          mikroOrm: {
            status: 'down',
            message: 'timeout of 1ms exceeded',
          },
        };

        return request(app.getHttpServer()).get('/health').expect(503).expect({
          status: 'error',
          info: {},
          error: details,
          details,
        });
      });

      it('should indicate that mikroOrm is down if the connection has been closed after startup', async () => {
        app = await setHealthEndpoint(({ healthCheck, mikroOrm }) =>
          healthCheck.check([async () => mikroOrm.pingCheck('mikroOrm')]),
        ).start();

        const up = {
          mikroOrm: {
            status: 'up',
          },
        };

        request(app.getHttpServer()).get('/health').expect(200).expect({
          status: 'ok',
          info: up,
          error: {},
          details: up,
        });

        const orm = app.get(MikroORM);
        await orm.close();

        const down = {
          mikroOrm: {
            status: 'down',
            message: 'Not connected to database',
          },
        };

        return request(app.getHttpServer()).get('/health').expect(503).expect({
          status: 'error',
          info: {},
          error: down,
          details: down,
        });
      });
    });
  });

  afterEach(async () => await app.close());
});

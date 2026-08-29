import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  bootstrapTestingModule,
  type DynamicHealthEndpointFn,
} from '../helper/index.js';

// @mikro-orm/mysql and @mikro-orm/mongodb v7 require Node.js >= 22.17.
const mikroOrm7DriversSupported =
  Number.parseInt(process.versions.node.split('.')[0], 10) >= 22;

describe.skipIf(!mikroOrm7DriversSupported)('MikroOrmHealthIndicator', () => {
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
        // `isConnected()` is typically a local flag check and can resolve in
        // well under 1ms against a live MySQL, so inject a slow connection.
        const slowConnection = {
          isConnected: () =>
            new Promise<boolean>((resolve) => {
              setTimeout(() => resolve(true), 50);
            }),
        };

        app = await setHealthEndpoint(({ healthCheck, mikroOrm }) =>
          healthCheck.check([
            async () =>
              mikroOrm.pingCheck('mikroOrm', {
                timeout: 1,
                connection: slowConnection,
              }),
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

      it('should indicate that mikroOrm is down if isConnected returns false', async () => {
        app = await setHealthEndpoint(({ healthCheck, mikroOrm }) =>
          healthCheck.check([
            async () =>
              mikroOrm.pingCheck('mikroOrm', {
                connection: { isConnected: async () => false },
              }),
          ]),
        ).start();

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

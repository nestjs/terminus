import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestingModule, DynamicHealthEndpointFn } from '../helper';

describe('SequelizeHealthIndicator', () => {
  let app: INestApplication;
  let setHealthEndpoint: DynamicHealthEndpointFn;

  beforeEach(
    () =>
      (setHealthEndpoint =
        bootstrapTestingModule().withSequelize().setHealthEndpoint),
  );

  describe('#pingCheck', () => {
    it('should check if the sequelize is available', async () => {
      app = await setHealthEndpoint(({ healthCheck, sequelize }) =>
        healthCheck.check([async () => sequelize.pingCheck('sequelize')]),
      ).start();
      const details = { sequelize: { status: 'up' } };
      return request(app.getHttpServer()).get('/health').expect(200).expect({
        status: 'ok',
        info: details,
        error: {},
        details,
      });
    });

    it('should throw an error if runs into timeout error', async () => {
      app = await setHealthEndpoint(({ healthCheck, sequelize }) =>
        healthCheck.check([
          async () => sequelize.pingCheck('sequelize', { timeout: 1 }),
        ]),
      ).start();

      const details = {
        sequelize: {
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
  });

  afterEach(async () => await app.close());
});

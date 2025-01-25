import { type INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  bootstrapTestingModule,
  type DynamicHealthEndpointFn,
} from '../helper';

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

      const details = { typeorm: { status: 'up' } };
      return request(app.getHttpServer()).get('/health').expect(200).expect({
        status: 'ok',
        info: details,
        error: {},
        details,
      });
    });

    // FIXME: Find a better way to test timeout errors
    // This test has been disabled because it is flaky
    //   it('should throw an error if runs into timeout error', async () => {
    //     app = await setHealthEndpoint(({ healthCheck, typeorm }) =>
    //       healthCheck.check([
    //         async () => typeorm.pingCheck('typeorm', { timeout: 1 }),
    //       ]),
    //     ).start();

    //     const details = {
    //       typeorm: {
    //         status: 'down',
    //         message: 'timeout of 1ms exceeded',
    //       },
    //     };

    //     return request(app.getHttpServer()).get('/health').expect(503).expect({
    //       status: 'error',
    //       info: {},
    //       error: details,
    //       details,
    //     });
    //   });
  });

  afterEach(async () => await app.close());
});

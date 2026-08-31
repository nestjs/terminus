import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  bootstrapTestingModule,
  type DynamicHealthEndpointFn,
} from '../helper/index.js';

describe('MongooseHealthIndicator', () => {
  let app: INestApplication;
  let setHealthEndpoint: DynamicHealthEndpointFn;

  beforeEach(
    () =>
      (setHealthEndpoint =
        bootstrapTestingModule().withMongoose().setHealthEndpoint),
  );

  describe('#pingCheck', () => {
    it('should check if the mongodb is available', async () => {
      app = await setHealthEndpoint(({ healthCheck, mongoose }) =>
        healthCheck.check([async () => mongoose.pingCheck('mongo')]),
      ).start();
      const details = {
        mongo: { status: 'up', responseTime: expect.any(Number) },
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

  afterEach(async () => await app.close());
});

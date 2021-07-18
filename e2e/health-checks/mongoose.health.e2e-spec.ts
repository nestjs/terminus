import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestingModule, DynamicHealthEndpointFn } from '../helper';

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
      const details = { mongo: { status: 'up' } };
      return request(app.getHttpServer()).get('/health').expect(200).expect({
        status: 'ok',
        info: details,
        error: {},
        details,
      });
    });
  });

  afterEach(async () => await app.close());
});

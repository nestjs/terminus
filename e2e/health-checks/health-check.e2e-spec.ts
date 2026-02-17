import { type INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { type HealthIndicatorResult } from '../../lib';
import {
  type DynamicHealthEndpointFn,
  bootstrapTestingModule,
} from '../helper';

describe('HealthCheck', () => {
  let app: INestApplication;
  let setHealthEndpoint: DynamicHealthEndpointFn;

  const healthyCheck = () =>
    Promise.resolve<HealthIndicatorResult>({ status: 'up' } as any);

  beforeEach(
    () => (setHealthEndpoint = bootstrapTestingModule().setHealthEndpoint),
  );

  it('should set the Cache-Control header to no-cache, no-store, must-revalidate', async () => {
    app = await setHealthEndpoint(({ healthCheck }) =>
      healthCheck.check([healthyCheck]),
    ).start();

    return request(app.getHttpServer())
      .get('/health')
      .expect('Cache-Control', 'no-cache, no-store, must-revalidate');
  });
});

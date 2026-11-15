import { type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { type HealthIndicatorResult } from '../../lib/index.js';
import {
  type DynamicHealthEndpointFn,
  bootstrapTestingModule,
} from '../helper/index.js';

describe('HealthCheck', () => {
  let app: INestApplication;
  let setHealthEndpoint: DynamicHealthEndpointFn;

  const healthyCheck = () =>
    Promise.resolve<HealthIndicatorResult>({ status: 'up' } as any);

  const getHealthResponses = () =>
    SwaggerModule.createDocument(app, new DocumentBuilder().build()).paths[
      '/health'
    ].get?.responses;

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

  it('should keep the Cache-Control header when only swaggerDocumentation is disabled', async () => {
    app = await setHealthEndpoint(
      ({ healthCheck }) => healthCheck.check([healthyCheck]),
      { healthCheckOptions: { swaggerDocumentation: false } },
    ).start();

    await request(app.getHttpServer())
      .get('/health')
      .expect('Cache-Control', 'no-cache, no-store, must-revalidate');
    expect(getHealthResponses()).not.toHaveProperty('503');
  });

  it('should keep the Swagger documentation when only noCache is disabled', async () => {
    app = await setHealthEndpoint(
      ({ healthCheck }) => healthCheck.check([healthyCheck]),
      { healthCheckOptions: { noCache: false } },
    ).start();

    const response = await request(app.getHttpServer()).get('/health');
    expect(response.headers['cache-control']).toBeUndefined();
    expect(getHealthResponses()).toHaveProperty('503');
  });

  afterEach(async () => await app.close());
});

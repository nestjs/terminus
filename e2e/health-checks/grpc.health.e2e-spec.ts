import { type INestApplication, type INestMicroservice } from '@nestjs/common';
import { type GrpcOptions } from '@nestjs/microservices';
import request from 'supertest';
import {
  bootstrapGrpcMicroservice,
  bootstrapTestingModule,
  type DynamicHealthEndpointFn,
  GRPC_URL,
} from '../helper/index.js';

describe('GRPCHealthIndicator', () => {
  let app: INestApplication;
  let microservice: INestMicroservice;
  let setHealthEndpoint: DynamicHealthEndpointFn;

  beforeEach(
    () => (setHealthEndpoint = bootstrapTestingModule().setHealthEndpoint),
  );

  afterEach(async () => {
    await app.close();
    await microservice.close();
  });

  const startApp = (options: Partial<GrpcOptions['options']> = {}) =>
    setHealthEndpoint(({ healthCheck, grpc }) =>
      healthCheck.check([
        async () =>
          grpc.checkService<GrpcOptions>('grpc', '', {
            url: GRPC_URL,
            ...options,
          }),
      ]),
    ).start();

  it('should be up when the service is SERVING', async () => {
    microservice = await bootstrapGrpcMicroservice(1);
    app = await startApp();

    const details = {
      grpc: {
        status: 'up',
        statusCode: 1,
        servingStatus: 'SERVING',
        responseTime: expect.any(Number),
      },
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

  it('should be down when the service is NOT_SERVING', async () => {
    microservice = await bootstrapGrpcMicroservice(2);
    app = await startApp();

    const details = {
      grpc: {
        status: 'down',
        message: 'serving status: NOT_SERVING',
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

  it('should be down when it runs into the timeout', async () => {
    microservice = await bootstrapGrpcMicroservice(1);
    app = await startApp({ timeout: 1 } as any);

    const details = {
      grpc: {
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

  it('should be down when the service is not reachable', async () => {
    microservice = await bootstrapGrpcMicroservice(1);
    app = await startApp();
    await microservice.close();

    const res = await request(app.getHttpServer()).get('/health').expect(503);
    expect(res.body.status).toBe('error');
    expect(res.body.error.grpc.status).toBe('down');
    expect(res.body.error.grpc.message).toEqual(expect.any(String));
  });
});

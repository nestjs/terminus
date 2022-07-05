import * as request from 'supertest';
import { INestApplication, INestMicroservice } from '@nestjs/common';
import {
  bootstrapMicroservice,
  bootstrapTestingModule,
  DynamicHealthEndpointFn,
} from '../helper';
import { Transport } from '@nestjs/microservices';

describe('MicroserviceHealthIndicator', () => {
  let app: INestApplication;
  let microservice: INestMicroservice;
  let setHealthEndpoint: DynamicHealthEndpointFn;

  beforeEach(
    () => (setHealthEndpoint = bootstrapTestingModule().setHealthEndpoint),
  );

  beforeEach(async () => {
    microservice = await bootstrapMicroservice();
  });

  it('should check if the microservice is available', async () => {
    app = await setHealthEndpoint(({ healthCheck, microservice }) =>
      healthCheck.check([
        async () =>
          microservice.pingCheck('tcp', {
            transport: Transport.TCP,
            options: {
              host: '0.0.0.0',
              port: 8889,
            },
          }),
      ]),
    ).start();

    const details = { tcp: { status: 'up' } };
    return request(app.getHttpServer()).get('/health').expect(200).expect({
      status: 'ok',
      info: details,
      error: {},
      details,
    });
  });

  it('should throw an error if the service is not reachable', async () => {
    app = await setHealthEndpoint(({ healthCheck, microservice }) =>
      healthCheck.check([
        async () =>
          microservice.pingCheck('tcp', {
            transport: Transport.TCP,
            options: {
              host: '0.0.0.0',
              port: 8889,
            },
          }),
      ]),
    ).start();

    await microservice.close();

    const details = {
      tcp: { status: 'down', message: 'connect ECONNREFUSED 0.0.0.0:8889' },
    };
    return request(app.getHttpServer()).get('/health').expect(503).expect({
      status: 'error',
      info: {},
      error: details,
      details,
    });
  });

  it('should throw an error if an RMQ microservice is not reachable', async () => {
    app = await setHealthEndpoint(({ healthCheck, microservice }) =>
      healthCheck.check([
        async () =>
          microservice.pingCheck('rmq', {
            transport: Transport.RMQ,
            options: {
              host: '0.0.0.0',
              port: 8889,
            },
          }),
      ]),
    ).start();

    await microservice.close();

    const details = {
      rmq: { status: 'down', message: 'rmq is not available' },
    };
    return request(app.getHttpServer()).get('/health').expect(503).expect({
      status: 'error',
      info: {},
      error: details,
      details,
    });
  });

  afterEach(async () => await app.close());
  afterEach(async () => await microservice.close());
});

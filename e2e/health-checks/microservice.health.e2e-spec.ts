import { type INestApplication, type INestMicroservice } from '@nestjs/common';
import {
  type KafkaOptions,
  type RmqOptions,
  type TcpClientOptions,
  Transport,
} from '@nestjs/microservices';
import * as request from 'supertest';
import {
  bootstrapMicroservice,
  bootstrapTestingModule,
  type DynamicHealthEndpointFn,
} from '../helper';

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

  describe('TCP', () => {
    it('should connect', async () => {
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

    it('should throw an error if is not reachable', async () => {
      app = await setHealthEndpoint(({ healthCheck, microservice }) =>
        healthCheck.check([
          async () =>
            microservice.pingCheck<TcpClientOptions>('tcp', {
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
  });

  describe('RMQ', () => {
    it('should connect', async () => {
      app = await setHealthEndpoint(({ healthCheck, microservice }) =>
        healthCheck.check([
          async () =>
            microservice.pingCheck<RmqOptions>('rmq', {
              transport: Transport.RMQ,
              options: {
                urls: ['amqp://localhost:5672'],
              },
            }),
        ]),
      ).start();

      const details = { rmq: { status: 'up' } };
      return request(app.getHttpServer()).get('/health').expect(200).expect({
        status: 'ok',
        info: details,
        error: {},
        details,
      });
    });

    it('should throw an error if is not reachable', async () => {
      app = await setHealthEndpoint(({ healthCheck, microservice }) =>
        healthCheck.check([
          async () =>
            microservice.pingCheck<RmqOptions>('rmq', {
              transport: Transport.RMQ,
              options: {
                urls: ['amqp://0.0.0.0:8889'],
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
  });

  describe('Kafka', () => {
    it('should connect', async () => {
      app = await setHealthEndpoint(({ healthCheck, microservice }) =>
        healthCheck.check([
          async () =>
            microservice.pingCheck<KafkaOptions>('kafka', {
              transport: Transport.KAFKA,
              options: {
                client: {
                  brokers: ['localhost:9092'],
                },
              },
            }),
        ]),
      ).start();

      const details = { kafka: { status: 'up' } };
      return request(app.getHttpServer()).get('/health').expect(200).expect({
        status: 'ok',
        info: details,
        error: {},
        details,
      });
    });
  });

  afterEach(async () => await app.close());
  afterEach(async () => await microservice.close());
});

import { type INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  bootstrapRemoteServer,
  bootstrapTestingModule,
  type DynamicHealthEndpointFn,
  type DynamicRemoteServerFn,
} from '../helper';

describe(`HttpHealthIndicator`, () => {
  let app: INestApplication;
  let remoteServer: DynamicRemoteServerFn;
  let setHealthEndpoint: DynamicHealthEndpointFn;

  beforeEach(async () => (remoteServer = await bootstrapRemoteServer()));
  beforeEach(
    () =>
      (setHealthEndpoint =
        bootstrapTestingModule().withHttp().setHealthEndpoint),
  );

  describe('#pingCheck', () => {
    it('should return a healthy response if the remote server sends 200 status code', async () => {
      await remoteServer.get('/', (_, res) => res.sendStatus(200)).start();
      app = await setHealthEndpoint(({ healthCheck, http }) =>
        healthCheck.check([() => http.pingCheck('http', remoteServer.url)]),
      ).start();

      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect({
          status: 'ok',
          info: { http: { status: 'up' } },
          error: {},
          details: { http: { status: 'up' } },
        });
    });

    it('should check if correctly display a timeout error', async () => {
      remoteServer
        .get('/', (_, res) =>
          setTimeout(() => {
            res.sendStatus(200);
          }, 200),
        )
        .start();

      app = await setHealthEndpoint(({ healthCheck, http }) =>
        healthCheck.check([
          () => http.pingCheck('google', remoteServer.url, { timeout: 1 }),
        ]),
      ).start();

      const details = {
        google: { status: 'down', message: 'timeout of 1ms exceeded' },
      };

      return request(app.getHttpServer()).get('/health').expect(503).expect({
        status: 'error',
        info: {},
        error: details,
        details,
      });
    });

    it('should display an error message when the address does not exist', async () => {
      app = await setHealthEndpoint(({ healthCheck, http }) =>
        healthCheck.check([
          () =>
            http.pingCheck('http', 'https://asdfn-not-an-actual-address.com'),
        ]),
      ).start();

      const details = {
        http: {
          status: 'down',
          message: 'getaddrinfo ENOTFOUND asdfn-not-an-actual-address.com',
        },
      };

      return request(app.getHttpServer()).get('/health').expect(503).expect({
        status: 'error',
        info: {},
        error: details,
        details,
      });
    });

    it('should return an error if the address return 404', async () => {
      await remoteServer.get('/', (_, res) => res.sendStatus(404)).start();
      app = await setHealthEndpoint(({ healthCheck, http }) =>
        healthCheck.check([() => http.pingCheck('http', remoteServer.url)]),
      ).start();

      const details = {
        http: {
          status: 'down',
          message: 'Request failed with status code 404',
          statusCode: 404,
          statusText: 'Not Found',
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

  describe('#responseCheck', () => {
    it('should be healthy if remote server returns 200 and status code 200 is expected', async () => {
      await remoteServer.get('/', (_, res) => res.sendStatus(200)).start();
      app = await setHealthEndpoint(({ healthCheck, http }) =>
        healthCheck.check([
          () =>
            http.responseCheck(
              'http',
              remoteServer.url,
              (res) => res.status === 200,
            ),
        ]),
      ).start();

      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect({
          status: 'ok',
          info: { http: { status: 'up' } },
          error: {},
          details: { http: { status: 'up' } },
        });
    });

    it('should not be healthy if remote server returns 400 and status code 200 is expected', async () => {
      await remoteServer.get('/', (_, res) => res.sendStatus(400)).start();
      app = await setHealthEndpoint(({ healthCheck, http }) =>
        healthCheck.check([
          () =>
            http.responseCheck(
              'http',
              remoteServer.url,
              (res) => res.status === 200,
            ),
        ]),
      ).start();

      const details = {
        http: {
          status: 'down',
          message: 'Request failed with status code 400',
          statusCode: 400,
          statusText: 'Bad Request',
        },
      };

      return request(app.getHttpServer()).get('/health').expect(503).expect({
        status: 'error',
        info: {},
        error: details,
        details,
      });
    });

    it('should be healthy if remote server returns a text which is expected', async () => {
      await remoteServer
        .get('/', (_, res) => res.send('response data'))
        .start();

      app = await setHealthEndpoint(({ healthCheck, http }) =>
        healthCheck.check([
          () =>
            http.responseCheck(
              'http',
              remoteServer.url,
              (res) => res.data === 'response data',
            ),
        ]),
      ).start();

      return request(app.getHttpServer()).get('/health').expect(200);
    });

    it('should not be healthy if remote server returns a text which is not expected', async () => {
      await remoteServer
        .get('/', (_, res) => res.send('not response data'))
        .start();

      app = await setHealthEndpoint(({ healthCheck, http }) =>
        healthCheck.check([
          () =>
            http.responseCheck(
              'http',
              remoteServer.url,
              (res) => res.data === 'response data',
            ),
        ]),
      ).start();

      return request(app.getHttpServer()).get('/health').expect(503);
    });

    it('should be healthy if remote server returns 400 and status code 400 is expected', async () => {
      await remoteServer.get('/', (_, res) => res.sendStatus(400)).start();
      app = await setHealthEndpoint(({ healthCheck, http }) =>
        healthCheck.check([
          () =>
            http.responseCheck(
              'http',
              remoteServer.url,
              (res) => res.status === 400,
            ),
        ]),
      ).start();

      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect({
          status: 'ok',
          info: { http: { status: 'up' } },
          error: {},
          details: { http: { status: 'up' } },
        });
    });
  });

  afterEach(async () => await app.close());
  afterEach(() => remoteServer.close());
});

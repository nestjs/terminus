import { INestApplication } from '@nestjs/common';

import Axios from 'axios';
import { HttpHealthIndicator, TerminusModuleOptions } from '../../lib';
import { bootstrapModule } from '../helper/bootstrap-module';
import { AxiosResponse, AxiosError } from 'axios';
import * as express from 'express';
import * as portfinder from 'portfinder';

describe('HTTP Health', () => {
  describe('pingCheck', () => {
    let app: INestApplication;
    let port: number;

    const getTerminusOptions = (
      http: HttpHealthIndicator,
    ): TerminusModuleOptions => ({
      endpoints: [
        {
          url: '/health',
          healthIndicators: [
            async () => http.pingCheck('http', 'https://google.com'),
          ],
        },
      ],
    });

    it('should check if google is available', async () => {
      [app, port] = await bootstrapModule({
        inject: [HttpHealthIndicator],
        useFactory: getTerminusOptions,
      });
      const info = { http: { status: 'up' } };
      const response = await Axios.get(`http://0.0.0.0:${port}/health`);
      expect(response.status).toBe(200);
      expect(response.data).toEqual({
        status: 'ok',
        info,
        details: info,
      });
    });

    it('should check if correctly display a timeout error', async () => {
      [app, port] = await bootstrapModule({
        inject: [HttpHealthIndicator],
        useFactory: (http: HttpHealthIndicator): TerminusModuleOptions => ({
          endpoints: [
            {
              url: '/health',
              healthIndicators: [
                async () =>
                  http.pingCheck('http', 'https://google.com', { timeout: 1 }),
              ],
            },
          ],
        }),
      });

      const details = { http: { status: 'down', message: expect.any(String) } };
      try {
        await Axios.get(`http://0.0.0.0:${port}/health`);
      } catch (error) {
        expect(error.response.status).toBe(503);
        expect(error.response.data).toEqual({
          status: 'error',
          error: details,
          details,
        });
      }
    });

    it('should check if correctly display not found error', async () => {
      [app, port] = await bootstrapModule({
        inject: [HttpHealthIndicator],
        useFactory: (http: HttpHealthIndicator): TerminusModuleOptions => ({
          endpoints: [
            {
              url: '/health',
              healthIndicators: [
                async () =>
                  http.pingCheck(
                    'http',
                    'https://asdfn-not-an-actual-address.com',
                  ),
              ],
            },
          ],
        }),
      });

      const details = { http: { status: 'down', message: expect.any(String) } };

      try {
        await Axios.get(`http://0.0.0.0:${port}/health`);
      } catch (error) {
        expect(error.response.status).toBe(503);
        expect(error.response.data).toEqual({
          status: 'error',
          error: details,
          details,
        });
      }
    });

    it('should check if correctly display not found error', async () => {
      [app, port] = await bootstrapModule({
        inject: [HttpHealthIndicator],
        useFactory: (http: HttpHealthIndicator): TerminusModuleOptions => ({
          endpoints: [
            {
              url: '/health',
              healthIndicators: [
                async () =>
                  http.pingCheck(
                    'http',
                    'https://pokeapi.co/api/v2/pokemon/134125',
                  ),
              ],
            },
          ],
        }),
      });

      const details = {
        http: {
          status: 'down',
          message: expect.any(String),
          statusCode: 404,
          statusText: 'Not Found',
        },
      };
      try {
        await Axios.get(`http://0.0.0.0:${port}/health`);
      } catch (error) {
        expect(error.response.status).toBe(503);
        expect(error.response.data).toEqual({
          status: 'error',
          error: details,
          details,
        });
      }
    });

    afterEach(async () => await app.close());
  });

  describe('responseCheck', () => {
    let remoteServer: any;
    let remoteServiceUrl: string;

    let nestApp: INestApplication;
    let nestPort: number;

    const getTerminusOptions = (
      remoteServiceUrl: string,
      callback: (response: AxiosResponse) => boolean | Promise<boolean>,
    ) => (
      httpResponseHealthIndicator: HttpHealthIndicator,
    ): TerminusModuleOptions => ({
      endpoints: [
        {
          url: '/health',
          healthIndicators: [
            async () =>
              httpResponseHealthIndicator.responseCheck(
                'http',
                remoteServiceUrl,
                callback,
              ),
          ],
        },
      ],
    });

    beforeAll(async () => {
      const remoteServicePort = await portfinder.getPortPromise();

      remoteServer = express();

      remoteServer.get('/', (_req: express.Request, res: express.Response) => {
        res.send({});
      });

      remoteServer.listen(remoteServicePort);

      remoteServiceUrl = `http://0.0.0.0:${remoteServicePort}/`;
    });

    afterAll(async () => {
      remoteServer.close();
    });

    afterEach(async () => {
      await nestApp.close();
    });

    it('callback returning true should return 200 w/response', async () => {
      expect.assertions(2);

      const callback = () => true;

      [nestApp, nestPort] = await bootstrapModule({
        inject: [HttpHealthIndicator],
        useFactory: getTerminusOptions(remoteServiceUrl, callback),
      });

      const nestAppUrl = await nestApp.getUrl();

      const response = await Axios.get(
        new URL('/health', nestAppUrl).toString(),
      );

      expect(response.status).toBe(200);
      expect(response.data).toEqual({
        status: 'ok',
        info: {
          http: {
            status: 'up',
          },
        },
        details: {
          http: {
            status: 'up',
          },
        },
      });
    });

    it('callback returning false should return 503 w/response', async () => {
      expect.assertions(2);

      const callback = () => false;

      [nestApp, nestPort] = await bootstrapModule({
        inject: [HttpHealthIndicator],
        useFactory: getTerminusOptions(remoteServiceUrl, callback),
      });

      const nestAppUrl = await nestApp.getUrl();

      try {
        await Axios.get(new URL('/health', nestAppUrl).toString());
        fail('an error should have been thrown');
      } catch (err) {
        expect(err.response.status).toBe(503);
        expect(err.response.data).toEqual({
          status: 'error',
          error: {
            http: {
              status: 'down',
            },
          },
          details: {
            http: {
              status: 'down',
            },
          },
        });
      }
    });

    it('callback throwing error should return 503 w/response', async () => {
      expect.assertions(2);

      const err = {
        name: 'error name value',
        message: 'axios.request threw an error for some reason',
        config: {},
        code: 'status code value',
        request: {},
        response: {},
        isAxiosError: true,
        toJSON: () => ({}),
      } as AxiosError;

      const callback = () => {
        throw err;
      };

      [nestApp, nestPort] = await bootstrapModule({
        inject: [HttpHealthIndicator],
        useFactory: getTerminusOptions(remoteServiceUrl, callback),
      });

      const nestAppUrl = await nestApp.getUrl();

      try {
        await Axios.get(new URL('/health', nestAppUrl).toString());
        fail('an error should have been thrown');
      } catch (err) {
        expect(err.response.status).toBe(503);
        expect(err.response.data).toEqual({
          status: 'error',
          error: {
            http: {
              status: 'down',
              message: 'axios.request threw an error for some reason',
            },
          },
          details: {
            http: {
              status: 'down',
              message: 'axios.request threw an error for some reason',
            },
          },
        });
      }
    });
  });
});

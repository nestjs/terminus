import { INestApplication } from '@nestjs/common';
import * as portfinder from 'portfinder';
import Axios from 'axios';
import { HttpResponseHealthIndicator, TerminusModuleOptions } from '../../lib';
import { bootstrapModule } from '../helper/bootstrap-module';
import * as express from 'express'
import { AxiosResponse, AxiosError } from 'axios';

describe('Http Response Health', () => {
  let remoteServer: any
  let remoteServiceUrl: string

  let nestApp: INestApplication;
  let nestPort: number;

  const getTerminusOptions = (remoteServiceUrl: string, callback: (response: AxiosResponse) => boolean | Promise<boolean>) => (
    httpResponseHealthIndicator: HttpResponseHealthIndicator,
  ): TerminusModuleOptions => ({
    endpoints: [
      {
        url: '/health',
        healthIndicators: [
          async () => httpResponseHealthIndicator.checkResponse('http', remoteServiceUrl, callback),
        ],
      },
    ],
  });

  beforeAll(async () => {
    const remoteServicePort = await portfinder.getPortPromise();

    remoteServer = express();

    remoteServer.get('/', (_req: express.Request, res: express.Response) => {
      res.send({})
    });

    remoteServer.listen(remoteServicePort);

    remoteServiceUrl = `http://0.0.0.0:${remoteServicePort}/`;
  });

  afterAll(async () => {
    remoteServer.close();
  });

  afterEach(async () => {
    await nestApp.close()
  });

  it('callback returning true should return 200 w/response', async () => {
    expect.assertions(2);

    const callback = () => true;

    [nestApp, nestPort] = await bootstrapModule({
      inject: [HttpResponseHealthIndicator],
      useFactory: getTerminusOptions(remoteServiceUrl, callback),
    });

    const nestAppUrl = await nestApp.getUrl();

    const response = await Axios.get(new URL('/health', nestAppUrl).toString());

    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      status: 'ok',
      info: {
        http: {
          status: 'up'
        }
      },
      details: {
        http: {
          status: 'up'
        }
      },
    });
  });

  it('callback returning false should return 503 w/response', async () => {
    expect.assertions(2);

    const callback = () => false;

    [nestApp, nestPort] = await bootstrapModule({
      inject: [HttpResponseHealthIndicator],
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
            status: 'down'
          }
        },
        details: {
          http: {
            status: 'down'
          }
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
      toJSON: () => ({})
    } as AxiosError

    const callback = () => { throw err };

    [nestApp, nestPort] = await bootstrapModule({
      inject: [HttpResponseHealthIndicator],
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
            message: 'axios.request threw an error for some reason'
          }
        },
        details: {
          http: {
            status: 'down',
            message: 'axios.request threw an error for some reason'
          }
        },
      });
    }
  });

});

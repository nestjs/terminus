import { INestApplication } from '@nestjs/common';

import Axios from 'axios';
import { DNSHealthIndicator, TerminusModuleOptions } from '../../lib';
import { bootstrapModule } from '../helper/bootstrap-module';

describe('DNS Health', () => {
  let app: INestApplication;
  let port: number;

  const getTerminusOptions = (
    dns: DNSHealthIndicator,
  ): TerminusModuleOptions => ({
    endpoints: [
      {
        url: '/health',
        healthIndicators: [
          async () => dns.pingCheck('dns', 'https://google.com'),
        ],
      },
    ],
  });

  it('should check if google is available', async () => {
    [app, port] = await bootstrapModule({
      inject: [DNSHealthIndicator],
      useFactory: getTerminusOptions,
    });
    const info = { dns: { status: 'up' } };
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
      inject: [DNSHealthIndicator],
      useFactory: (dns: DNSHealthIndicator): TerminusModuleOptions => ({
        endpoints: [
          {
            url: '/health',
            healthIndicators: [
              async () =>
                dns.pingCheck('dns', 'https://google.com', { timeout: 1 }),
            ],
          },
        ],
      }),
    });

    const details = { dns: { status: 'down', message: expect.any(String) } };
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
      inject: [DNSHealthIndicator],
      useFactory: (dns: DNSHealthIndicator): TerminusModuleOptions => ({
        endpoints: [
          {
            url: '/health',
            healthIndicators: [
              async () =>
                dns.pingCheck('dns', 'https://asdfn-not-an-actual-address.com'),
            ],
          },
        ],
      }),
    });

    const details = { dns: { status: 'down', message: expect.any(String) } };

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
      inject: [DNSHealthIndicator],
      useFactory: (dns: DNSHealthIndicator): TerminusModuleOptions => ({
        endpoints: [
          {
            url: '/health',
            healthIndicators: [
              async () =>
                dns.pingCheck(
                  'dns',
                  'https://pokeapi.co/api/v2/pokemon/134125',
                ),
            ],
          },
        ],
      }),
    });

    const details = {
      dns: {
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

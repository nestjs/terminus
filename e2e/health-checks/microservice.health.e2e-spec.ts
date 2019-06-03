import { INestApplication } from '@nestjs/common';

import Axios from 'axios';
import { TerminusModuleOptions, MicroserviceHealthIndicator } from '../../lib';
import { bootstrapModule } from '../helper/bootstrap-module';
import { Transport } from '@nestjs/microservices';

describe('Microservice Health', () => {
  let app: INestApplication;
  let port: number;

  const getTerminusOptions = (
    microservice: MicroserviceHealthIndicator,
  ): TerminusModuleOptions => {
    const tcpCheck = async () =>
      microservice.pingCheck('tcp', {
        transport: Transport.TCP,
        options: {
          host: '0.0.0.0',
          port: 8890,
        },
      });

    return {
      endpoints: [
        {
          url: '/health',
          healthIndicators: [tcpCheck],
        },
      ],
    };
  };

  it('should check if the microservice is available', async () => {
    [app, port] = await bootstrapModule(
      {
        inject: [MicroserviceHealthIndicator],
        useFactory: getTerminusOptions,
      },
      false,
      false,
      false,
      8890,
    );

    const response = await Axios.get(`http://0.0.0.0:${port}/health`);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      status: 'ok',
      details: { tcp: { status: 'up' } },
    });
  });

  it('should throw an error if runs into timeout error', async () => {
    [app, port] = await bootstrapModule(
      {
        inject: [MicroserviceHealthIndicator],
        useFactory: (
          microservice: MicroserviceHealthIndicator,
        ): TerminusModuleOptions => ({
          endpoints: [
            {
              url: '/health',
              healthIndicators: [
                async () =>
                  microservice.pingCheck('tcp', {
                    timeout: 1,
                    transport: Transport.TCP,
                    options: {
                      host: '0.0.0.0',
                      port: 8889,
                    },
                  }),
              ],
            },
          ],
        }),
      },
      false,
      false,
      false,
      8889,
    );

    try {
      await Axios.get(`http://0.0.0.0:${port}/health`, {});
    } catch (error) {
      expect(error.response.status).toBe(503);
      expect(error.response.data).toEqual({
        status: 'error',
        details: {
          tcp: {
            status: 'down',
            message: expect.any(String),
          },
        },
      });
    }
  });

  afterEach(async () => await app.close());
});

import { INestApplication } from '@nestjs/common';
import { TerminusModuleOptions, TerminusEndpoint } from '../lib';

import Axios from 'axios';
import { HealthCheckError } from '@godaddy/terminus';
import { bootstrapModule } from './helper/bootstrap-module';

describe('Custom Logger', () => {
  let app: INestApplication;
  let port: number;

  it('should log an error to the custom logger if an error has been thrown', async () => {
    const mockLogger = (message: string, error: HealthCheckError) => {
      expect(message).toBe('healthcheck failed');
      expect(error.causes).toEqual({ test: 'test' });
    };

    const healthError = new HealthCheckError('test', { test: 'test' });
    const testHealthInidcator = async () => {
      throw healthError;
    };

    const endpoints: TerminusEndpoint[] = [
      {
        url: '/health',
        healthIndicators: [testHealthInidcator],
      },
    ];

    [app, port] = await bootstrapModule({
      useFactory: (): TerminusModuleOptions => ({
        endpoints,
        logger: mockLogger,
      }),
    });

    try {
      await Axios.get(`http://0.0.0.0:${port}/health`);
    } catch (err) {}
  });

  afterEach(async () => await app.close());
});

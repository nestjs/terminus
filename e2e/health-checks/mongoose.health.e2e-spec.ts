import { INestApplication } from '@nestjs/common';

import Axios from 'axios';
import { MongooseHealthIndicator, TerminusModuleOptions } from '../../lib';
import { bootstrapModule } from '../helper/bootstrap-module';

describe('Mongoose Database Health', () => {
  let app: INestApplication;
  let port: number;

  const getTerminusOptions = (
    db: MongooseHealthIndicator,
  ): TerminusModuleOptions => ({
    endpoints: [
      {
        url: '/health',
        healthIndicators: [async () => db.pingCheck('mongo')],
      },
    ],
  });

  it('should check if the mongoose is available', async () => {
    [app, port] = await bootstrapModule(
      {
        inject: [MongooseHealthIndicator],
        useFactory: getTerminusOptions,
      },
      false,
      true,
    );

    const response = await Axios.get(`http://0.0.0.0:${port}/health`);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      status: 'ok',
      info: { mongo: { status: 'up' } },
    });
  });

  it('should throw an error if runs into timeout error', async () => {
    [app, port] = await bootstrapModule(
      {
        inject: [MongooseHealthIndicator],
        useFactory: (db: MongooseHealthIndicator): TerminusModuleOptions => ({
          endpoints: [
            {
              url: '/health',
              healthIndicators: [
                async () => db.pingCheck('mongo', { timeout: 1 }),
              ],
            },
          ],
        }),
      },
      false,
      true,
    );

    try {
      await Axios.get(`http://0.0.0.0:${port}/health`, {});
    } catch (error) {
      expect(error.response.status).toBe(503);
      expect(error.response.data).toEqual({
        status: 'error',
        error: {
          mongo: {
            status: 'down',
            message: expect.any(String),
          },
        },
      });
    }
  });

  afterEach(async () => await app.close());
});

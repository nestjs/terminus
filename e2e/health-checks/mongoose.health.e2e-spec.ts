import { INestApplication } from '@nestjs/common';
import { MongooseHealthIndicator, TerminusModuleOptions } from '../../lib';

import Axios from 'axios';
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
      true,
    );

    const response = await Axios.get(`http://0.0.0.0:${port}/health`);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      status: 'ok',
      info: { database: { status: 'up' } },
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
      true,
    );

    try {
      await Axios.get(`http://0.0.0.0:${port}/health`, {});
    } catch (error) {
      expect(error.response.status).toBe(503);
      expect(error.response.data).toEqual({
        status: 'error',
        error: {
          database: {
            status: 'down',
            message: expect.any(String),
          },
        },
      });
    }
  });

  afterEach(async () => await app.close());
});

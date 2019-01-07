import { INestApplication } from '@nestjs/common';
import { DatabaseHealthIndicator, TerminusModuleOptions } from '../../lib';

import Axios from 'axios';
import { bootstrapModule } from '../helper/bootstrap-module';

describe('TypeOrm Database Health', () => {
  let app: INestApplication;
  let port: number;

  const getTerminusOptions = (
    db: DatabaseHealthIndicator,
  ): TerminusModuleOptions => ({
    endpoints: [
      {
        url: '/health',
        healthIndicators: [async () => db.pingCheck('typeorm')],
      },
    ],
  });

  it('should check if the typeorm is available', async () => {
    [app, port] = await bootstrapModule(
      {
        inject: [DatabaseHealthIndicator],
        useFactory: getTerminusOptions,
      },
      true,
      false,
    );

    const response = await Axios.get(`http://0.0.0.0:${port}/health`);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      status: 'ok',
      info: { typeorm: { status: 'up' } },
    });
  });

  it('should throw an error if runs into timeout error', async () => {
    [app, port] = await bootstrapModule(
      {
        inject: [DatabaseHealthIndicator],
        useFactory: (db: DatabaseHealthIndicator): TerminusModuleOptions => ({
          endpoints: [
            {
              url: '/health',
              healthIndicators: [
                async () => db.pingCheck('typeorm', { timeout: 1 }),
              ],
            },
          ],
        }),
      },
      true,
      false,
    );

    try {
      await Axios.get(`http://0.0.0.0:${port}/health`, {});
    } catch (error) {
      expect(error.response.status).toBe(503);
      expect(error.response.data).toEqual({
        status: 'error',
        error: {
          typeorm: {
            status: 'down',
            message: expect.any(String),
          },
        },
      });
    }
  });

  afterEach(async () => await app.close());
});

import { INestApplication } from '@nestjs/common';

import Axios from 'axios';
import { SequelizeHealthIndicator, TerminusModuleOptions } from '../../lib';
import { bootstrapModule } from '../helper/bootstrap-module';

describe('Sequelize Database Health', () => {
  let app: INestApplication;
  let port: number;

  const getTerminusOptions = (
      db: SequelizeHealthIndicator,
    ): TerminusModuleOptions => ({
      endpoints: [
        {
          url: '/health',
          healthIndicators: [async () => db.pingCheck('sequelize')],
        },
      ],
    });
  
    it('should check if the sequelize is available', async () => {
      [app, port] = await bootstrapModule(
        {
          inject: [SequelizeHealthIndicator],
          useFactory: getTerminusOptions,
        },
        false,
        true,
      );
  
      const info = { sequelize: { status: 'up' } };
      const response = await Axios.get(`http://0.0.0.0:${port}/health`);
      expect(response.status).toBe(200);
      expect(response.data).toEqual({
        status: 'ok',
        info,
        details: info,
      });
    });
  
    it('should throw an error if runs into timeout error', async () => {
      [app, port] = await bootstrapModule(
        {
          inject: [SequelizeHealthIndicator],
          useFactory: (db: SequelizeHealthIndicator): TerminusModuleOptions => ({
            endpoints: [
              {
                url: '/health',
                healthIndicators: [
                  async () => db.pingCheck('sequelize', { timeout: 1 }),
                ],
              },
            ],
          }),
        },
        false,
        true,
      );
  
      const details = {
        sequelize: {
          status: 'down',
          message: expect.any(String),
        },
      };
      try {
        await Axios.get(`http://0.0.0.0:${port}/health`, {});
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
    

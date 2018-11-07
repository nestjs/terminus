import { INestApplication, DynamicModule } from '@nestjs/common';
import {
  DatabaseHealthIndicator,
  TerminusModuleAsyncOptions,
  TerminusModule,
  TerminusModuleOptions,
} from '../../lib';
import { NestFactory } from '@nestjs/core';

import { TypeOrmModule } from '@nestjs/typeorm';
import Axios from 'axios';

describe('Database Health', () => {
  let app: INestApplication;
  const PORT = process.env.PORT || 3001;

  const getTerminusOptions = (
    db: DatabaseHealthIndicator,
  ): TerminusModuleOptions => ({
    endpoints: [
      {
        url: '/health',
        healthIndicators: [async () => db.pingCheck('database')],
      },
    ],
  });

  class ApplicationModule {
    static forRoot(options: TerminusModuleAsyncOptions): DynamicModule {
      return {
        module: ApplicationModule,
        imports: [
          TypeOrmModule.forRoot({
            type: 'mysql',
            host: 'mysql',
            port: 3306,
            username: 'root',
            password: 'root',
            database: 'test',
            keepConnectionAlive: true,
            retryAttempts: 2,
            retryDelay: 1000,
          }),
          TerminusModule.forRootAsync(options),
        ],
      };
    }
  }

  async function bootstrapModule(options: TerminusModuleAsyncOptions) {
    app = await NestFactory.create(ApplicationModule.forRoot(options));
    await app.listen(PORT);
  }

  it('should check if the database is available', async () => {
    await bootstrapModule({
      inject: [DatabaseHealthIndicator],
      useFactory: getTerminusOptions,
    });

    const response = await Axios.get(`http://0.0.0.0:${PORT}/health`);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      status: 'ok',
      info: { database: { status: 'up' } },
    });
  });

  it('should throw an error if runs into timeout error', async () => {
    await bootstrapModule({
      inject: [DatabaseHealthIndicator],
      useFactory: (db: DatabaseHealthIndicator): TerminusModuleOptions => ({
        endpoints: [
          {
            url: '/health',
            healthIndicators: [
              async () => db.pingCheck('database', { timeout: 1 }),
            ],
          },
        ],
      }),
    });

    try {
      await Axios.get(`http://0.0.0.0:${PORT}/health`, {});
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

  afterEach(async () => {
    await app.close();
  });
});

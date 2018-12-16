import { INestApplication, DynamicModule } from '@nestjs/common';
import {
  TerminusModuleAsyncOptions,
  TerminusModule,
  TerminusModuleOptions,
} from '../lib';
import { NestFactory } from '@nestjs/core';

import { TypeOrmModule } from '@nestjs/typeorm';
import Axios from 'axios';
import { HealthCheckError } from '@godaddy/terminus';

describe('Custom Logger', () => {
  let app: INestApplication;
  const PORT = process.env.PORT || 3001;

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

  it('should log an error to the custom logger if an error has been thrown', async () => {
    const mockLogger = (message: string, error: HealthCheckError) => {
      expect(message).toBe('healthcheck failed');
      expect(error.causes).toEqual({ test: 'test' });
    };
    const healthError = new HealthCheckError('test', { test: 'test' });
    await bootstrapModule({
      useFactory: (): TerminusModuleOptions => ({
        logger: mockLogger,
        endpoints: [
          {
            url: '/health',
            healthIndicators: [
              async () => {
                throw healthError;
              },
            ],
          },
        ],
      }),
    });

    try {
      await Axios.get(`http://0.0.0.0:${PORT}/health`, {});
    } catch (err) {}
  });

  afterEach(async () => {
    await app.close();
  });
});

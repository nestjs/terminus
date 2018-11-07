import { INestApplication, DynamicModule } from '@nestjs/common';
import {
  DatabaseHealthIndicator,
  TerminusModuleAsyncOptions,
  TerminusModule,
  TerminusModuleOptions,
  DNSHealthIndicator,
} from '../../lib';
import { NestFactory } from '@nestjs/core';

import Axios from 'axios';

describe('DNS Health', () => {
  let app: INestApplication;
  const PORT = process.env.PORT || 3001;

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

  class ApplicationModule {
    static forRoot(options: TerminusModuleAsyncOptions): DynamicModule {
      return {
        module: ApplicationModule,
        imports: [TerminusModule.forRootAsync(options)],
      };
    }
  }

  async function bootstrapModule(options: TerminusModuleAsyncOptions) {
    app = await NestFactory.create(ApplicationModule.forRoot(options));
    await app.listen(PORT);
  }

  it('should check if google is available', async () => {
    await bootstrapModule({
      inject: [DNSHealthIndicator],
      useFactory: getTerminusOptions,
    });

    const response = await Axios.get(`http://0.0.0.0:${PORT}/health`);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      status: 'ok',
      info: { dns: { status: 'up' } },
    });
  });
  afterEach(async () => {
    app.close();
  });
});

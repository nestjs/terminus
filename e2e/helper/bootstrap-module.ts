import { TerminusModuleAsyncOptions, TerminusModule } from '../../lib';
import { DynamicModule, INestApplication } from '@nestjs/common';
import { NestFactory, FastifyAdapter } from '@nestjs/core';
import * as portfinder from 'portfinder';
import { TypeOrmModule } from '@nestjs/typeorm';

const DbModule = TypeOrmModule.forRoot({
  type: 'mysql',
  host: 'mysql',
  port: 3306,
  username: 'root',
  password: 'root',
  database: 'test',
  keepConnectionAlive: true,
  retryAttempts: 2,
  retryDelay: 1000,
});

class ApplicationModule {
  static forRoot(
    options: TerminusModuleAsyncOptions,
    useDb: boolean,
  ): DynamicModule {
    const imports = [TerminusModule.forRootAsync(options)];

    if (useDb) {
      imports.push(DbModule);
    }
    return {
      module: ApplicationModule,
      imports,
    };
  }
}

export async function bootstrapModule(
  options: TerminusModuleAsyncOptions,
  useDb: boolean = false,
  useFastify?: boolean,
): Promise<[INestApplication, number]> {
  const app = await NestFactory.create(
    ApplicationModule.forRoot(options, useDb),
    useFastify ? new FastifyAdapter() : null,
  );

  const port = await portfinder.getPortPromise({
    port: 3000,
    stopPort: 8888,
  });
  await app.listen(port, '0.0.0.0');
  return [app, port];
}

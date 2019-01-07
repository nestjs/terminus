import { TerminusModuleAsyncOptions, TerminusModule } from '../../lib';
import { DynamicModule, INestApplication } from '@nestjs/common';
import { NestFactory, FastifyAdapter } from '@nestjs/core';
import * as portfinder from 'portfinder';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';

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

const MongooseDbModule = MongooseModule.forRoot(
  'mongodb://127.0.0.1:27017/mydb_test',
  {
    retryAttempts: 5,
    retryDelay: 5000,
    useNewUrlParser: true,
  },
);

class ApplicationModule {
  static forRoot(
    options: TerminusModuleAsyncOptions,
    useDb: boolean,
    useMongoose: boolean,
  ): DynamicModule {
    const imports = [TerminusModule.forRootAsync(options)];

    if (useDb) {
      imports.push(DbModule);
    }

    if (useMongoose) {
      imports.push(MongooseDbModule);
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
  useMongoose: boolean = false,
  useFastify?: boolean,
): Promise<[INestApplication, number]> {
  const app = await NestFactory.create(
    ApplicationModule.forRoot(options, useDb, useMongoose),
    useFastify ? new FastifyAdapter() : null,
  );

  const port = await portfinder.getPortPromise({
    port: 3000,
    stopPort: 8888,
  });
  await app.listen(port, '0.0.0.0');
  return [app, port];
}

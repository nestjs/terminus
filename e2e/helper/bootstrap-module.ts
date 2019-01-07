import { DynamicModule, INestApplication, Module } from '@nestjs/common';
import { FastifyAdapter, NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { connect } from 'mongoose';
import * as portfinder from 'portfinder';
import { TerminusModule, TerminusModuleAsyncOptions } from '../../lib';

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

const mongooseDbProvders = [
  {
    provide: 'DatabaseConnection',
    useFactory: async () => {
      await connect(
        'mongodb://127.0.0.1:27017/mydb_test',
        {
          reconnectTries: 2,
          reconnectInterval: 1000,
          useNewUrlParser: true,
          autoReconnect: true,
        },
      );
    },
  },
];

@Module({
  providers: [...mongooseDbProvders],
  exports: [...mongooseDbProvders],
})
class MongooseDbModule {}

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
      imports.push(MongooseDbModule as any);
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

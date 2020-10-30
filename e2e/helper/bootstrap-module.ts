import { DynamicModule, INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { ExpressAdapter } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { SequelizeModule } from '@nestjs/sequelize';
import * as portfinder from 'portfinder';
import { TerminusModule, TerminusModuleAsyncOptions } from '../../lib';
import { Transport } from '@nestjs/microservices';

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

const DbSequelizeModule = SequelizeModule.forRoot({
  dialect: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'root',
  database: 'test',
  retryAttempts: 2,
  retryDelay: 1000,
});

const MongoModule = MongooseModule.forRoot('mongodb://mongodb:27017/test');

class ApplicationModule {
  static forRoot(
    options: TerminusModuleAsyncOptions,
    useDb: boolean,
    useMongoose: boolean,
    useSequelize: boolean
  ): DynamicModule {
    const imports = [TerminusModule.forRootAsync(options)];

    if (useDb) {
      imports.push(DbModule);
    }

    if (useMongoose) {
      imports.push(MongoModule);
    }

    if (useSequelize) {
      imports.push(DbSequelizeModule);
    }
    
    return {
      module: ApplicationModule,
      imports,
    };
  }
}

async function bootstrapMicroservice(tcpPort: number) {
  const tcpApp = await NestFactory.createMicroservice(ApplicationModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: tcpPort,
    },
  });

  await tcpApp.listenAsync();
}

export async function bootstrapModule(
  options: TerminusModuleAsyncOptions,
  useDb: boolean = false,
  useMongoose: boolean = false,
  useDbSequelize: boolean = false,
  useFastify?: boolean,
  tcpPort?: number,
): Promise<[INestApplication, number]> {
  const app = await NestFactory.create(
    ApplicationModule.forRoot(options, useDb, useMongoose, useDbSequelize),
    useFastify ? new FastifyAdapter() : new ExpressAdapter(),
  );

  if (tcpPort) {
    await bootstrapMicroservice(tcpPort);
  }

  const port = await portfinder.getPortPromise({
    port: 3000,
    stopPort: 8888,
  });
  await app.listen(port, '0.0.0.0');
  return [app, port];
}

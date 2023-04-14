import {
  Controller,
  Get,
  INestApplication,
  ModuleMetadata,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { ExpressAdapter } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  DiskHealthIndicator,
  HealthCheckResult,
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  MicroserviceHealthIndicator,
  MongooseHealthIndicator,
  PrismaORMHealthIndicator,
  SequelizeHealthIndicator,
  TerminusModule,
  TypeOrmHealthIndicator,
} from '../../lib';
import { SequelizeModule } from '@nestjs/sequelize';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { MikroOrmHealthIndicator } from '../../lib/health-indicator/database/mikro-orm.health';
import { MikroOrmModule } from '@mikro-orm/nestjs';

type TestingHealthFunc = (props: {
  healthCheck: HealthCheckService;
  http: HttpHealthIndicator;
  disk: DiskHealthIndicator;
  memory: MemoryHealthIndicator;
  microservice: MicroserviceHealthIndicator;
  mongoose: MongooseHealthIndicator;
  sequelize: SequelizeHealthIndicator;
  typeorm: TypeOrmHealthIndicator;
  mikroOrm: MikroOrmHealthIndicator;
  prisma: PrismaORMHealthIndicator;
}) => Promise<HealthCheckResult>;

function createHealthController(func: TestingHealthFunc) {
  @Controller()
  class HealthController {
    constructor(
      private readonly healthCheck: HealthCheckService,
      private readonly http: HttpHealthIndicator,
      private readonly disk: DiskHealthIndicator,
      private readonly memoryHealthIndicator: MemoryHealthIndicator,
      private readonly microservice: MicroserviceHealthIndicator,
      private readonly mongoose: MongooseHealthIndicator,
      private readonly sequelize: SequelizeHealthIndicator,
      private readonly typeorm: TypeOrmHealthIndicator,
      private readonly mikroOrm: MikroOrmHealthIndicator,
      private readonly prisma: PrismaORMHealthIndicator,
    ) {}
    @Get('health')
    health() {
      return func({
        healthCheck: this.healthCheck,
        http: this.http,
        disk: this.disk,
        memory: this.memoryHealthIndicator,
        microservice: this.microservice,
        mongoose: this.mongoose,
        sequelize: this.sequelize,
        typeorm: this.typeorm,
        mikroOrm: this.mikroOrm,
        prisma: this.prisma,
      });
    }
  }

  return HealthController;
}

type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];

export type DynamicHealthEndpointFn = (func: TestingHealthFunc) => {
  start(
    httpAdapter?: FastifyAdapter | ExpressAdapter,
  ): Promise<INestApplication>;
};

export function bootstrapTestingModule() {
  const imports: PropType<ModuleMetadata, 'imports'> = [TerminusModule];

  function setHealthEndpoint(func: TestingHealthFunc) {
    const testingModule = Test.createTestingModule({
      imports,
      controllers: [createHealthController(func)],
    });

    async function start(
      httpAdapter: FastifyAdapter | ExpressAdapter = new ExpressAdapter(),
    ) {
      const moduleRef = await testingModule.compile();

      const app = moduleRef.createNestApplication(httpAdapter);

      await app.init();
      await app.getHttpAdapter().getInstance().ready?.();
      return app;
    }

    return { start };
  }

  function withMongoose() {
    imports.push(MongooseModule.forRoot('mongodb://0.0.0.0:27017/test'));

    return { setHealthEndpoint };
  }

  function withSequelize() {
    imports.push(
      SequelizeModule.forRoot({
        dialect: 'mysql',
        host: '0.0.0.0',
        port: 3306,
        username: 'root',
        password: 'root',
        database: 'test',
        retryAttempts: 2,
        retryDelay: 1000,
      }),
    );

    return { setHealthEndpoint };
  }
  function withTypeOrm() {
    imports.push(
      TypeOrmModule.forRoot({
        type: 'mysql',
        host: '0.0.0.0',
        port: 3306,
        username: 'root',
        password: 'root',
        database: 'test',
        keepConnectionAlive: true,
        retryAttempts: 2,
        retryDelay: 1000,
      }),
    );

    return { setHealthEndpoint };
  }

  function withMikroOrm() {
    return {
      andMongo: () => {
        imports.push(
          MikroOrmModule.forRoot({
            type: 'mongo',
            dbName: 'test',
            discovery: { warnWhenNoEntities: false },
            strict: true,
            clientUrl: 'mongodb://0.0.0.0:27017',
          }),
        );

        return { setHealthEndpoint };
      },
      andMysql: () => {
        imports.push(
          MikroOrmModule.forRoot({
            type: 'mysql',
            host: '0.0.0.0',
            port: 3306,
            user: 'root',
            password: 'root',
            dbName: 'test',
            discovery: { warnWhenNoEntities: false },
            strict: true,
          }),
        );

        return { setHealthEndpoint };
      },
    };
  }

  function withPrisma() {
    return {
      andMySql: () => {
        return { setHealthEndpoint };
      },
      andMongo: () => {
        return { setHealthEndpoint };
      },
    };
  }

  function withHttp() {
    imports.push(HttpModule);
    return { setHealthEndpoint };
  }

  return {
    withMongoose,
    withTypeOrm,
    withSequelize,
    withHttp,
    withPrisma,
    withMikroOrm,
    setHealthEndpoint,
  };
}

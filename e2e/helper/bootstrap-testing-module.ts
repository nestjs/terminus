import { MongoDriver } from '@mikro-orm/mongodb';
import { MySqlDriver } from '@mikro-orm/mysql';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HttpModule } from '@nestjs/axios';
import {
  Controller,
  Get,
  type INestApplication,
  type ModuleMetadata,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExpressAdapter } from '@nestjs/platform-express';
import { type FastifyAdapter } from '@nestjs/platform-fastify';
import { SequelizeModule } from '@nestjs/sequelize';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DiskHealthIndicator,
  HealthCheck,
  type HealthCheckResult,
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  MicroserviceHealthIndicator,
  MongooseHealthIndicator,
  PrismaHealthIndicator,
  SequelizeHealthIndicator,
  TerminusModule,
  TypeOrmHealthIndicator,
  type TerminusModuleOptions,
} from '../../lib';
import { type HealthCheckOptions } from '../../lib/health-check';
import { MikroOrmHealthIndicator } from '../../lib/health-indicator/database/mikro-orm.health';

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
  prisma: PrismaHealthIndicator;
}) => Promise<HealthCheckResult>;

function createHealthController(
  func: TestingHealthFunc,
  options: { healthCheckOptions?: HealthCheckOptions },
) {
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
      private readonly prisma: PrismaHealthIndicator,
    ) {}
    @Get('health')
    @HealthCheck(options.healthCheckOptions)
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

export type DynamicHealthEndpointFn = (
  func: TestingHealthFunc,
  options?: { healthCheckOptions?: HealthCheckOptions },
) => {
  start(
    httpAdapter?: FastifyAdapter | ExpressAdapter,
  ): Promise<INestApplication>;
};

export function bootstrapTestingModule(
  terminusModuleOptions: TerminusModuleOptions = {},
) {
  const imports: PropType<ModuleMetadata, 'imports'> = [
    TerminusModule.forRoot(terminusModuleOptions),
  ];

  const setHealthEndpoint: DynamicHealthEndpointFn = (func, options = {}) => {
    const testingModule = Test.createTestingModule({
      imports,
      controllers: [createHealthController(func, options)],
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
  };

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
            driver: MongoDriver,
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
            driver: MySqlDriver,
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

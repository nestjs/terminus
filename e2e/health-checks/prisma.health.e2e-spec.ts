import { INestApplication } from '@nestjs/common';
import { PrismaClient as MongoPrismaClient } from '../prisma/generated/mongodb';
import { PrismaClient as MySQLPrismaClient } from '../prisma/generated/mysql';
import { bootstrapTestingModule, DynamicHealthEndpointFn } from '../helper';
import * as request from 'supertest';

jest.setTimeout(300_000);

describe('PrismaHealthIndicator', () => {
  let app: INestApplication;
  let setHealthEndpoint: DynamicHealthEndpointFn;

  describe('mongodb', () => {
    beforeEach(
      () =>
        (setHealthEndpoint = bootstrapTestingModule()
          .withPrisma()
          .andMongo().setHealthEndpoint),
    );

    describe('#pingCheck', () => {
      it('should check if the prisma is available', async () => {
        app = await setHealthEndpoint(({ healthCheck, prisma }) =>
          healthCheck.check([
            async () =>
              prisma.pingCheck('prismamongo', new MongoPrismaClient()),
          ]),
        ).start();

        return request(app.getHttpServer())
          .get('/health')
          .expect(200)
          .expect({
            status: 'ok',
            info: { prismamongo: { status: 'up' } },
            error: {},
            details: { prismamongo: { status: 'up' } },
          });
      });

      it('should throw an error if runs into timeout error', async () => {
        app = await setHealthEndpoint(({ healthCheck, prisma }) =>
          healthCheck.check([
            async () =>
              prisma.pingCheck('prismamongo', new MongoPrismaClient(), {
                timeout: 1,
              }),
          ]),
        ).start();

        return request(app.getHttpServer())
          .get('/health')
          .expect(503)
          .expect({
            status: 'error',
            info: {},
            error: {
              prismamongo: {
                status: 'down',
                message: 'timeout of 1ms exceeded',
              },
            },
            details: {
              prismamongo: {
                status: 'down',
                message: 'timeout of 1ms exceeded',
              },
            },
          });
      });
    });
  });

  describe('mysql', () => {
    beforeEach(
      () =>
        (setHealthEndpoint = bootstrapTestingModule()
          .withPrisma()
          .andMySql().setHealthEndpoint),
    );

    describe('#pingCheck', () => {
      it('should check if the prisma is available', async () => {
        app = await setHealthEndpoint(({ healthCheck, prisma }) =>
          healthCheck.check([
            async () => prisma.pingCheck('prisma', new MySQLPrismaClient()),
          ]),
        ).start();

        return request(app.getHttpServer())
          .get('/health')
          .expect({
            status: 'ok',
            info: { prisma: { status: 'up' } },
            error: {},
            details: { prisma: { status: 'up' } },
          });
      });

      it('should throw an error if runs into timeout error', async () => {
        app = await setHealthEndpoint(({ healthCheck, prisma }) =>
          healthCheck.check([
            async () =>
              prisma.pingCheck('prisma', new MySQLPrismaClient(), {
                timeout: 1,
              }),
          ]),
        ).start();

        return request(app.getHttpServer())
          .get('/health')
          .expect(503)
          .expect({
            status: 'error',
            error: {
              prisma: { status: 'down', message: 'timeout of 1ms exceeded' },
            },
            info: {},
            details: {
              prisma: { status: 'down', message: 'timeout of 1ms exceeded' },
            },
          });
      });
    });
  });

  afterEach(async () => await app.close());
});

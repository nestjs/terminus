import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { bootstrapTestingModule, DynamicHealthEndpointFn } from '../helper';
import * as request from 'supertest';

jest.setTimeout(30000);

describe('PrismaOrmHealthIndicator', () => {
  let app: INestApplication;
  let setHealthEndpoint: DynamicHealthEndpointFn;

  describe('mysql', () => {
    describe('#pingCheck', () => {
      beforeEach(
        () =>
          (setHealthEndpoint = bootstrapTestingModule()
            .withPrisma()
            .andMySql().setHealthEndpoint),
      );

      it('should check if the prisma is available', async () => {
        app = await setHealthEndpoint(({ healthCheck, prisma }) =>
          healthCheck.check([
            async () => prisma.pingCheck('prisma', new PrismaClient()),
          ]),
        ).start();

        return request(app.getHttpServer())
          .get('/health')
          .expect(200)
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
              prisma.pingCheck('prisma', new PrismaClient(), { timeout: 1 }),
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

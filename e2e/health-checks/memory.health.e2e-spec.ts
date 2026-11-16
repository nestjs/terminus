import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  bootstrapTestingModule,
  type DynamicHealthEndpointFn,
} from '../helper/index.js';

describe('MemoryHealthIndicator', () => {
  let app: INestApplication;
  let setHealthEndpoint: DynamicHealthEndpointFn;

  beforeEach(
    () => (setHealthEndpoint = bootstrapTestingModule().setHealthEndpoint),
  );

  describe('#checkHeap', () => {
    it('should check if the rss threshold is not exceeded', async () => {
      app = await setHealthEndpoint(({ healthCheck, memory }) =>
        healthCheck.check([
          async () => {
            const { rss } = process.memoryUsage();
            return memory.checkHeap('memory_rss', rss + 1);
          },
        ]),
      ).start();

      const details = {
        memory_rss: { status: 'up', responseTime: expect.any(Number) },
      };

      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect(({ body }) =>
          expect(body).toEqual({
            status: 'ok',
            info: details,
            error: {},
            details,
          }),
        );
    });

    it('should check if the heap threshold is not exceeded', async () => {
      app = await setHealthEndpoint(({ healthCheck, memory }) =>
        healthCheck.check([
          async () =>
            memory.checkHeap('memory_heap', 1 * 1024 * 1024 * 1024 * 1024),
        ]),
      ).start();
      const details = {
        memory_heap: { status: 'up', responseTime: expect.any(Number) },
      };
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect(({ body }) =>
          expect(body).toEqual({
            status: 'ok',
            info: details,
            error: {},
            details,
          }),
        );
    });

    it('should check if correctly displays a heap exceeded error', async () => {
      app = await setHealthEndpoint(({ healthCheck, memory }) =>
        healthCheck.check([async () => memory.checkHeap('memory_heap', 0)]),
      ).start();

      const details = {
        memory_heap: {
          status: 'down',
          message: 'Used heap exceeded the set threshold',
          responseTime: expect.any(Number),
        },
      };

      return request(app.getHttpServer())
        .get('/health')
        .expect(503)
        .expect(({ body }) =>
          expect(body).toEqual({
            status: 'error',
            info: {},
            error: details,
            details,
          }),
        );
    });
  });

  describe('#checkHeap builders', () => {
    it('should be degraded, not down, with degradedOnFailure()', async () => {
      app = await setHealthEndpoint(({ healthCheck, memory }) =>
        healthCheck.check([
          () => memory.checkHeap('memory_heap', 0).degradedOnFailure(),
        ]),
      ).start();

      const details = {
        memory_heap: {
          status: 'degraded',
          message: 'Used heap exceeded the set threshold',
          responseTime: expect.any(Number),
        },
      };
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect(({ body }) =>
          expect(body).toEqual({
            status: 'degraded',
            info: details,
            error: {},
            details,
          }),
        );
    });
  });

  afterEach(async () => await app.close());
});

import { INestApplication } from '@nestjs/common';

import Axios from 'axios';
import { MemoryHealthIndicator, TerminusModuleOptions } from '../../lib';
import { bootstrapModule } from '../helper/bootstrap-module';

describe('Memory Health', () => {
  let app: INestApplication;
  let port: number;

  describe('checkRss', () => {
    let getTerminusOptions: (
      memory: MemoryHealthIndicator,
    ) => TerminusModuleOptions;
    beforeEach(async () => {
      getTerminusOptions = (
        memory: MemoryHealthIndicator,
      ): TerminusModuleOptions => ({
        endpoints: [
          {
            url: '/health',
            healthIndicators: [
              async () => {
                const { rss } = process.memoryUsage();
                return memory.checkHeap('memory_rss', rss + 1);
              },
            ],
          },
        ],
      });
    });

    it('should check if the rss threshold is not exceeded', async () => {
      [app, port] = await bootstrapModule({
        inject: [MemoryHealthIndicator],
        useFactory: getTerminusOptions,
      });
      const info = { memory_rss: { status: 'up' } };
      const response = await Axios.get(`http://0.0.0.0:${port}/health`);
      expect(response.status).toBe(200);
      expect(response.data).toEqual({
        status: 'ok',
        info,
        details: info,
      });
    });
  });

  describe('checkHeap', () => {
    it('should check if the heap threshold is not exceeded', async () => {
      const getTerminusOptions = (
        memory: MemoryHealthIndicator,
      ): TerminusModuleOptions => ({
        endpoints: [
          {
            url: '/health',
            healthIndicators: [
              async () =>
                memory.checkHeap('memory_heap', 1 * 1024 * 1024 * 1024 * 1024),
            ],
          },
        ],
      });

      [app, port] = await bootstrapModule({
        inject: [MemoryHealthIndicator],
        useFactory: getTerminusOptions,
      });
      const info = { memory_heap: { status: 'up' } };
      const response = await Axios.get(`http://0.0.0.0:${port}/health`);
      expect(response.status).toBe(200);
      expect(response.data).toEqual({
        status: 'ok',
        info,
        details: info,
      });
    });

    it('should check if correctly displays a heap exceeded error', async () => {
      [app, port] = await bootstrapModule({
        inject: [MemoryHealthIndicator],
        useFactory: (disk: MemoryHealthIndicator): TerminusModuleOptions => ({
          endpoints: [
            {
              url: '/health',
              healthIndicators: [async () => disk.checkHeap('memory_heap', 0)],
            },
          ],
        }),
      });

      const details = {
        memory_heap: { status: 'down', message: expect.any(String) },
      };

      try {
        await Axios.get(`http://0.0.0.0:${port}/health`);
      } catch (error) {
        expect(error.response.status).toBe(503);
        expect(error.response.data).toEqual({
          status: 'error',
          error: details,
          details,
        });
      }
    });
  });

  afterEach(async () => await app.close());
});

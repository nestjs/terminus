import request from 'supertest';
import { Test } from '@nestjs/testing';
import { HealthModule } from '../src/health/health.module.js';
import { INestApplication } from '@nestjs/common';

describe('HealthModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  it('/health (GET)', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(body.status).toBe('ok');
    expect(body.details.memory_heap.status).toBe('up');
    expect(body.details.memory_rss.status).toBe('up');
  });
});

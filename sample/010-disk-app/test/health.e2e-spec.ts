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
    const { status, body } = await request(app.getHttpServer()).get('/health');

    // Whether the disk check passes depends on how full the machine running it
    // is, so the assertion is that the response code matches the verdict.
    const verdict = body.details['disk health'].status;
    expect(verdict).toMatch(/^(up|down)$/);
    expect(status).toBe(verdict === 'up' ? 200 : 503);
  });
});

import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { HealthModule } from '../src/health/health.module';
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

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({
        status: 'ok',
        info: { dog: { status: 'up' } },
        error: {},
        details: { dog: { status: 'up' } },
      });
  });
});

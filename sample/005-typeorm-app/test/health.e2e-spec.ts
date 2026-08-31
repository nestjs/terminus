import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HealthModule } from '../src/health/health.module';

// This sample stays CommonJS on purpose: it is the canary proving a CJS app
// can require(esm) the ESM-only @nestjs/terminus, which in turn loads its
// ESM-only optional peer (@nestjs/typeorm).
let app: INestApplication;

before(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [HealthModule],
  }).compile();

  app = moduleRef.createNestApplication();
  await app.listen(0);
});

after(() => app.close());

test('GET /health reports the typeorm indicator as up', async () => {
  const response = await fetch(`${await app.getUrl()}/health`);

  assert.equal(response.status, 200);
  const { typeorm } = (await response.json()).details;
  assert.equal(typeorm.status, 'up');
  assert.equal(typeof typeorm.responseTime, 'number');
});

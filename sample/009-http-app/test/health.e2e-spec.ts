import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

// This sample stays CommonJS on purpose: it is the canary proving a CJS app
// can require(esm) the ESM-only @nestjs/terminus, which in turn loads its
// ESM-only optional peer (@nestjs/axios).
let app: INestApplication;

before(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  await app.listen(0);
});

after(() => app.close());

test('GET /health pings the NestJS docs over HTTP', async () => {
  const response = await fetch(`${await app.getUrl()}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).details, {
    'nestjs-docs': { status: 'up' },
  });
});

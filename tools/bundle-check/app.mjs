/**
 * A small Nest app for `tools/bundle-check.mjs`. Plain JavaScript, so the
 * decorators are applied by hand and no compile step is needed.
 */
import 'reflect-metadata';
import { createServer } from 'node:http';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  HealthCheck,
  FetchHealthIndicator,
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  TerminusModule,
} from '../../dist/index.js';

const upstream = createServer((_, res) => res.end('ok')).listen(0);
const upstreamUrl = `http://127.0.0.1:${upstream.address().port}`;

class HealthController {
  constructor(health, http, memory, fetch) {
    Object.assign(this, { health, http, memory, fetch });
  }

  check() {
    return this.health.check([
      // Loads the optional `@nestjs/axios` peer
      () => this.http.pingCheck('http', upstreamUrl),
      () => this.memory.checkHeap('heap', 4 * 1024 ** 3),
      () => this.fetch.pingCheck('fetch', upstreamUrl),
    ]);
  }
}
const check = Object.getOwnPropertyDescriptor(HealthController.prototype, 'check');
Get()(HealthController.prototype, 'check', check);
HealthCheck()(HealthController.prototype, 'check', check);
Reflect.defineMetadata(
  'design:paramtypes',
  [HealthCheckService, HttpHealthIndicator, MemoryHealthIndicator, FetchHealthIndicator],
  HealthController,
);
Controller('health')(HealthController);

class AppModule {}
Module({ imports: [TerminusModule], controllers: [HealthController] })(AppModule);

// No top-level await: esbuild cannot emit it as CommonJS
async function main() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  await app.listen(0, '127.0.0.1');
  const response = await fetch(`${await app.getUrl()}/health`);
  const body = await response.text();
  await app.close();
  upstream.close();

  console.log(response.status, body);
  process.exit(response.status === 200 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

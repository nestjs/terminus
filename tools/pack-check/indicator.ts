// Compiled by `tools/pack-check.mjs` against the packed tarball, with
// `declaration: true`. Not part of the repo's own typecheck (see tsconfig.json),
// because `@nestjs/terminus` must resolve to the installed package.
import {
  type ByteSize,
  type Duration,
  DiskHealthIndicator,
  FetchHealthIndicator,
  HealthCheckService,
  HealthIndicatorService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

export class Indicators {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicator: HealthIndicatorService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly fetch: FetchHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  upOrDown(up: boolean) {
    const session = this.indicator.check('dog');
    return up ? session.up({ goodBoys: 1 }) : session.down('bad');
  }
  degraded() {
    return this.indicator.check('dog').degraded();
  }
  attempt() {
    return this.indicator.check('dog').attempt(async () => 1);
  }
  builders() {
    return this.indicator
      .check('dog')
      .attempt(async () => 1)
      .withSuccessData((n) => ({ n }))
      .withData({ owner: 'team-dog' })
      .withFailureData((error) => ({ code: String(error) }))
      .withTimeout(100)
      .cacheFor(100)
      .degradedAfter(50)
      .degradedOnFailure();
  }
  merged() {
    // The second call replaces `owner`, which changes its type
    return this.indicator
      .check('dog')
      .attempt(async () => 1)
      .withData({ owner: 'team-dog', a: 'a' })
      .withData({ owner: 1, b: 'b' })
      .withSuccessData((n) => ({ n }))
      .withSuccessData(() => ({ n: 'one' }));
  }
  builtIn() {
    return this.db.pingCheck('database').degradedOnFailure().cacheFor(100);
  }
  http() {
    return this.fetch
      .pingCheck('api', 'http://localhost', { verify: (res) => res.ok })
      .degradedAfter(200);
  }
  memoryAndDisk() {
    return this.health.check([
      () => this.memory.checkHeap('heap', 1024).degradedOnFailure(),
      this.memory
        .checkRSS('rss', 1024)
        .withData({ unit: 'bytes' })
        .cacheFor(100),
      () =>
        this.disk
          .checkStorage('disk', { path: '/', thresholdPercent: 0.9 })
          .withTimeout(100),
    ]);
  }
  strings(timeout: Duration, heap: ByteSize) {
    return this.health.check([
      () => this.memory.checkHeap('heap', heap).withTimeout(timeout),
      () =>
        this.disk
          .checkStorage('disk', { path: '/', threshold: '250gb' })
          .cacheFor('15s')
          .degradedAfter('300ms'),
    ]);
  }
  caught() {
    return this.builders()
      .catch(() => null)
      .finally(() => {});
  }
  asPromise(): Promise<unknown> {
    return this.builtIn();
  }
  async awaited() {
    return await this.builders();
  }
  async failureData() {
    const { api } = await this.http();
    return api.status === 'down' ? api.statusCode : undefined;
  }
  async dbFailureData() {
    const { database } = await this.builtIn();
    return database.status === 'down' ? database.code : undefined;
  }
  check() {
    return this.health.check([
      () => this.upOrDown(true),
      () => this.builders(),
      this.builtIn(),
      () => this.http(),
    ]);
  }
}

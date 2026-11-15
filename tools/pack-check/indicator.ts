// Compiled by `tools/pack-check.mjs` against the packed tarball, with
// `declaration: true`. Not part of the repo's own typecheck (see tsconfig.json),
// because `@nestjs/terminus` must resolve to the installed package.
import {
  HealthCheckService,
  HealthIndicatorService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

export class Indicators {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicator: HealthIndicatorService,
    private readonly db: TypeOrmHealthIndicator,
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
  async awaited() {
    return await this.builders();
  }
  check() {
    return this.health.check([
      () => this.upOrDown(true),
      () => this.builders(),
      this.builtIn(),
    ]);
  }
}

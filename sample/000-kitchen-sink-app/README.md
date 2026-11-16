# Kitchen sink

One app that shows most of what Terminus does, and how to use it well. It needs no database and no Docker.

```bash
pnpm build
pnpm start
```

| Route | For | Shows |
|---|---|---|
| `GET /health/live` | liveness probe | a check without indicators |
| `GET /health/ready` | readiness probe | `FetchHealthIndicator`, `DiskHealthIndicator`, two custom indicators, `degraded` |

Where to look:

- `src/health/health.controller.ts`: liveness and readiness, `withData()`, `degradedAfter()`, `degradedOnFailure()`, `withTimeout()`, `cacheFor()`, duration strings.
- `src/emails/email-queue.health.ts`: a custom indicator with `attempt()` and `withSuccessData()`.
- `src/cache/cache.health.ts`: a custom indicator with `up()` and `degraded()`.
- `src/health/health.module.ts`: `forRootAsync()` with the log style and the graceful shutdown timeout.
- `src/emails/email-queue.health.spec.ts`: a unit test of a custom indicator.
- `test/health.e2e-spec.ts`: tests for `ok`, `degraded` and `error`, with `overrideProvider()`.

Settings (environment variables):

| Variable | Default |
|---|---|
| `PAYMENTS_URL` | `https://docs.nestjs.com` |
| `STORAGE_THRESHOLD_PERCENT` | `0.9` |
| `TERMINUS_ERROR_LOG_STYLE` | `pretty` |
| `TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT_MS` | `0` |

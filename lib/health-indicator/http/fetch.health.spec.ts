import { createServer, type Server } from 'node:http';
import { type AddressInfo } from 'node:net';
import { HttpService } from '@nestjs/axios';
import { HttpClient, type HttpResponse } from '@nestjs/http-client';
import { lastValueFrom } from 'rxjs';
import { expectTypeOf } from 'vitest';
import { FetchHealthIndicator, type FetchLike } from './fetch.health.js';
import { HealthIndicatorService } from '../service/health-indicator.service.js';

// Real server, real clients: the claim under test is that one fetch-shaped
// contract fits all three without terminus knowing about any of them.
let server: Server;
let base: string;
let closed: string;
let aborted = 0;

beforeAll(async () => {
  server = createServer((req, res) => {
    req.on('close', () => !res.writableEnded && aborted++);
    if (req.url === '/slow') return void setTimeout(() => res.end(), 2000);
    if (req.url === '/down') return void res.writeHead(503).end('nope');
    res.writeHead(req.url === '/empty' ? 204 : 200).end('woof');
  });
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const probe = createServer().listen(0);
  await new Promise((r) => probe.once('listening', r));
  closed = `http://127.0.0.1:${(probe.address() as AddressInfo).port}`;
  await new Promise((r) => probe.close(r));
});
afterAll(() => server.close());

const indicator = new FetchHealthIndicator(new HealthIndicatorService());

const httpClient = new HttpClient({ retry: false });
const axios = new HttpService();
const clients: Record<string, FetchLike | undefined> = {
  'native fetch': undefined,
  '@nestjs/http-client': httpClient.request, // passed as-is, no adapter
  '@nestjs/axios': (url, init) =>
    lastValueFrom(axios.request({ url, ...init })),
};

describe.each(Object.entries(clients))(
  'FetchHealthIndicator with %s',
  (_, fetch) => {
    it('is up on 2xx', async () => {
      const result = await indicator.pingCheck('dep', `${base}/ok`, { fetch });
      expect(result.dep).toMatchObject({ status: 'up' });
      expect(result.dep).toHaveProperty('responseTime');
    });

    it('is down on 5xx and keeps statusCode/statusText', async () => {
      const result = await indicator.pingCheck('dep', `${base}/down`, {
        fetch,
      });
      expect(result.dep).toEqual({
        status: 'down',
        message: 'Request failed with status code 503',
        statusCode: 503,
        statusText: 'Service Unavailable',
        responseTime: expect.any(Number),
      });
    });

    it('is down when the host is unreachable', async () => {
      const result = await indicator.pingCheck('dep', closed, { fetch });
      expect(result.dep).toMatchObject({
        status: 'down',
        message: expect.stringContaining('ECONNREFUSED'),
      });
    });

    it('times out after 1000 ms by default', async () => {
      const result = await indicator.pingCheck('dep', `${base}/slow`, {
        fetch,
      });
      expect(result.dep).toMatchObject({
        status: 'down',
        message: 'timeout of 1000ms exceeded',
      });
    });

    it('aborts the request on withTimeout()', async () => {
      const before = aborted;
      const result = await indicator
        .pingCheck('dep', `${base}/slow`, { fetch })
        .withTimeout(50);
      expect(result.dep).toMatchObject({
        status: 'down',
        message: 'timeout of 50ms exceeded',
      });
      await vi.waitFor(() => expect(aborted).toBe(before + 1));
    });
  },
);

describe('FetchHealthIndicator#pingCheck with verify', () => {
  it('is up when verify returns true', async () => {
    const result = await indicator.pingCheck('dep', `${base}/ok`, {
      verify: async (res) => (await res.text()) === 'woof',
    });
    expect(result.dep).toMatchObject({ status: 'up' });
  });

  it('is down with the status when verify returns false', async () => {
    const result = await indicator.pingCheck('dep', `${base}/ok`, {
      verify: (res) => res.status === 204,
    });
    expect(result.dep).toEqual({
      status: 'down',
      message: 'Response did not pass the check',
      statusCode: 200,
      statusText: 'OK',
      responseTime: expect.any(Number),
    });
  });

  it('is down with the error message and status when verify throws', async () => {
    const result = await indicator.pingCheck('dep', `${base}/ok`, {
      verify: () => {
        throw new Error('version too old');
      },
    });
    expect(result.dep).toEqual({
      status: 'down',
      message: 'version too old',
      statusCode: 200,
      statusText: 'OK',
      responseTime: expect.any(Number),
    });
  });

  it('replaces the 2xx rule', async () => {
    const result = await indicator.pingCheck('dep', `${base}/down`, {
      verify: (res) => res.status === 503,
    });
    expect(result.dep).toMatchObject({ status: 'up' });
  });

  it('types the response from the fetch function', () => {
    // Only the types are checked: the attempts are never awaited.
    indicator.pingCheck('dep', base, {
      verify: (res) => {
        expectTypeOf(res).toEqualTypeOf<Response>();
        return true;
      },
    });
    indicator.pingCheck('dep', base, {
      fetch: httpClient.request,
      verify: (res) => {
        expectTypeOf(res).toEqualTypeOf<HttpResponse<unknown>>();
        return true;
      },
    });
    indicator.pingCheck('dep', base, {
      fetch: async () => ({ status: 200, version: '1.2.3' }),
      verify: (res) => {
        expectTypeOf(res).toEqualTypeOf<{ status: number; version: string }>();
        return true;
      },
    });
  });

  it('types statusCode and statusText on a failed result', async () => {
    const result = await indicator.pingCheck('dep', `${base}/down`);
    if (result.dep.status === 'down') {
      expectTypeOf(result.dep.statusCode).toEqualTypeOf<number | undefined>();
      expectTypeOf(result.dep.statusText).toEqualTypeOf<string | undefined>();
    }
    if (result.dep.status === 'up') {
      // Not the failure data: without withSuccessData() any key is `any` (#2796)
      expectTypeOf(result.dep.statusCode).toBeAny();
    }
  });

  it('sees the response of a client set not to throw on 4xx/5xx', async () => {
    const result = await indicator.pingCheck('dep', `${base}/down`, {
      fetch: (url, init) =>
        httpClient.request(url, { ...init, throwOnHttpError: false }),
      verify: (res) => res.status === 503,
    });
    expect(result.dep).toMatchObject({ status: 'up' });
  });
});

describe('FetchHealthIndicator#pingCheck', () => {
  it('calls a custom fetch function with method, headers and signal', async () => {
    const fetch = vi.fn(async () => ({ status: 200 }));
    const result = await indicator.pingCheck('dep', new URL(`${base}/ok`), {
      fetch,
      method: 'HEAD',
      headers: { authorization: 'Bearer token' },
    });
    expect(result.dep).toMatchObject({ status: 'up' });
    expect(fetch).toHaveBeenCalledWith(`${base}/ok`, {
      method: 'HEAD',
      headers: { authorization: 'Bearer token' },
      signal: expect.any(AbortSignal),
    });
  });

  it('reports the status of a client that throws on non-2xx', async () => {
    const result = await indicator.pingCheck('dep', base, {
      fetch: () =>
        Promise.reject(
          Object.assign(new Error('Bad Gateway'), {
            response: { status: 502, statusText: 'Bad Gateway' },
          }),
        ),
    });
    expect(result.dep).toMatchObject({
      status: 'down',
      message: 'Request failed with status code 502',
      statusCode: 502,
      statusText: 'Bad Gateway',
    });
  });

  it("reuses an app's configured client (baseUrl, no retries for the probe)", async () => {
    const billing = new HttpClient({ baseUrl: base }); // retries on by default
    const result = await indicator.pingCheck('billing', '/down', {
      fetch: (url, init) => billing.request(url, { ...init, retry: false }),
    });
    expect(result.billing).toMatchObject({ status: 'down', statusCode: 503 });
  });

  it('keeps the message and status with degradedOnFailure()', async () => {
    const result = await indicator
      .pingCheck('dep', `${base}/down`)
      .degradedOnFailure();
    expect(result.dep).toEqual({
      status: 'degraded',
      message: 'Request failed with status code 503',
      statusCode: 503,
      statusText: 'Service Unavailable',
      responseTime: expect.any(Number),
    });
  });
});

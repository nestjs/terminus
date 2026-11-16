import { Injectable } from '@nestjs/common';
import { errorMessage } from '../../utils/errorMessage.js';
import { ResponseStatusError } from '../../errors/response-status.error.js';
import { HealthIndicatorService } from '../service/health-indicator.service.js';

/**
 * The part of a response the indicator reads. Satisfied as-is by the web
 * `Response` (native `fetch`), `HttpResponse` (`@nestjs/http-client`) and
 * `AxiosResponse` (`@nestjs/axios`).
 *
 * @publicApi
 */
export interface HttpResponseLike {
  status: number;
  statusText?: string;
}

/**
 * What the indicator passes to the fetch function.
 *
 * @publicApi
 */
export interface FetchLikeInit {
  method: string;
  headers?: Record<string, string>;
  signal: AbortSignal;
}

/**
 * A function that sends one request: `globalThis.fetch`, `HttpClient.request`
 * from `@nestjs/http-client`, or a one-line wrapper around any other client.
 *
 * @publicApi
 */
export type FetchLike<TResponse extends HttpResponseLike = HttpResponseLike> = (
  url: string,
  init: FetchLikeInit,
) => Promise<TResponse>;

/**
 * @publicApi
 */
export interface FetchCheckOptions<
  TResponse extends HttpResponseLike = Response,
> {
  /** Sends the request. Default `globalThis.fetch`. */
  fetch?: FetchLike<TResponse>;
  /** Default `GET`. */
  method?: string;
  headers?: Record<string, string>;
  /**
   * Decides if the response is healthy. Return `true` for `up`, `false` for
   * `down`, or throw to be `down` with your error message.
   * Replaces the default rule (2xx is `up`), so check the status yourself if
   * it matters.
   *
   * Only sees responses the fetch function resolves with. Clients that throw
   * on 4xx/5xx (axios, `@nestjs/http-client`) need to be told not to
   * (`validateStatus: () => true`, `throwOnHttpError: false`).
   */
  verify?: (response: TResponse) => boolean | Promise<boolean>;
}

/**
 * Checks HTTP endpoints over any fetch-compatible function.
 * No peer dependency: native `fetch` is the default.
 *
 * @publicApi
 * @module TerminusModule
 */
@Injectable()
export class FetchHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  /**
   * `up` when the URL answers with a 2xx status, or when `verify` returns
   * `true`. A `down` result has the `statusCode` and `statusText` of the
   * response, if there was one. Times out after 1000 ms unless
   * `.withTimeout()` says otherwise.
   *
   * @param key The key which will be used for the result object
   * @param url The URL to request
   * @param options The fetch function, request options and `verify`
   *
   * @example
   * fetchHealthIndicator.pingCheck('docs', 'https://docs.nestjs.com').withTimeout(3000)
   * // slower than 300 ms: degraded, slower than 2000 ms: down
   * fetchHealthIndicator
   *   .pingCheck('payments', 'https://payments.example.com/health')
   *   .degradedAfter(300)
   *   .withTimeout(2000)
   * // with @nestjs/http-client, only a 204 is healthy
   * fetchHealthIndicator.pingCheck('billing', '/health', {
   *   fetch: httpClient.request,
   *   verify: (res) => res.status === 204,
   * })
   */
  pingCheck<
    const TKey extends string,
    TResponse extends HttpResponseLike = Response,
  >(
    key: TKey,
    url: string | URL,
    {
      fetch = globalThis.fetch as unknown as FetchLike<TResponse>,
      method = 'GET',
      headers,
      verify = isSuccess,
    }: FetchCheckOptions<TResponse> = {},
  ) {
    return this.healthIndicatorService
      .check(key)
      .attempt(async ({ signal }) => {
        let response: TResponse;
        try {
          response = await fetch(url.toString(), { method, headers, signal });
        } catch (err) {
          // Clients that throw on non-2xx (axios, @nestjs/http-client) still
          // report the status.
          const failed = statusOf(err);
          if (failed) {
            throw statusError(failed);
          }
          throw withCause(err);
        }

        let healthy: boolean;
        try {
          healthy = await verify(response);
        } catch (err) {
          throw statusError(response, errorMessage(err));
        } finally {
          await discardBody(response);
        }

        if (!healthy && isSuccess(response)) {
          throw statusError(response, 'Response did not pass the check');
        }
        if (!healthy) {
          throw statusError(response);
        }
      })
      .withFailureData(
        (error): { statusCode?: number; statusText?: string } => {
          // Optional: a network error has no response
          if (error instanceof ResponseStatusError) {
            const { statusCode, statusText } = error;
            return { statusCode, statusText };
          }
          return {};
        },
      )
      .withTimeout(1000);
  }
}

function isSuccess({ status }: HttpResponseLike) {
  return status >= 200 && status < 300;
}

/** An error that keeps the status of the response for the failure data. */
function statusError(
  { status, statusText }: HttpResponseLike,
  message = `Request failed with status code ${status}`,
) {
  return new ResponseStatusError(message, status, statusText);
}

/** `err.response.status` (axios), `err.status` (@nestjs/http-client, ky, …). */
function statusOf(err: any): HttpResponseLike | undefined {
  if (typeof err?.response?.status === 'number') {
    return err.response;
  }
  if (typeof err?.status === 'number') {
    return err;
  }
  return undefined;
}

/** Native fetch says only "fetch failed"; the reason is in `cause`. */
function withCause(err: unknown) {
  if (err instanceof TypeError && err.cause instanceof Error) {
    return new Error(`${err.message}: ${err.cause.message}`);
  }
  return err;
}

/** An unread fetch body holds its socket until GC; release it. */
async function discardBody(response: any) {
  if (response?.body?.cancel && !response.bodyUsed) {
    await response.body.cancel().catch(() => undefined);
  }
}

import { type URL } from 'url';
import type * as NestJSAxios from '@nestjs/axios';
import {
  ConsoleLogger,
  Inject,
  Injectable,
  type OnModuleInit,
  Scope,
} from '@nestjs/common';
import { lastValueFrom, type Observable } from 'rxjs';
import { type HealthIndicatorResult } from '../index.js';
import {
  type AxiosRequestConfig,
  type AxiosResponse,
} from './axios.interfaces.js';
import { type AxiosError } from '../../errors/axios.error.js';
import { TERMINUS_LOGGER } from '../../terminus.constants.js';
import { isAxiosError, loadPackage } from '../../utils/index.js';
import { type HealthIndicatorSession } from '../service/health-indicator-session.js';
import { HealthIndicatorService } from '../service/health-indicator.service.js';

interface HttpClientLike {
  request<T = any>(config: any): Observable<AxiosResponse<T>>;
}

// FIXME: Delete the HttpHealthIndicator in v13, use the FetchHealthIndicator instead (#2778)
/**
 * The HTTPHealthIndicator contains health indicators
 * which are used for health checks related to HTTP requests
 *
 * @deprecated Use `FetchHealthIndicator`, which works with native `fetch`,
 * `@nestjs/http-client` and `@nestjs/axios` and returns a `HealthCheckAttempt`
 * (`.withTimeout()`, `.cacheFor()`). Removed in v13. See
 * https://github.com/nestjs/terminus/issues/2778
 *
 * @publicApi
 * @module TerminusModule
 */
@Injectable({
  scope: Scope.TRANSIENT,
})
export class HttpHealthIndicator implements OnModuleInit {
  constructor(
    @Inject(TERMINUS_LOGGER)
    private readonly logger: ConsoleLogger,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {
    if (this.logger instanceof ConsoleLogger) {
      this.logger.setContext(HttpHealthIndicator.name);
    }
  }

  /**
   * Loads the optional peers, so that the bootstrap fails when they are
   * missing
   */
  async onModuleInit(): Promise<void> {
    await this.loadPeer();
  }

  private async loadPeer(): Promise<typeof NestJSAxios> {
    return await loadPackage(
      ['@nestjs/axios'],
      () => import('@nestjs/axios'),
      this.constructor.name,
    );
  }

  private async getHttpService(): Promise<HttpClientLike> {
    const { HttpService } = await this.loadPeer();
    return new HttpService();
  }

  /**
   * Builds the `down` result for a failed request
   * @param key The key which will be used for the result object
   * @param error The thrown error
   */
  private generateHttpError(
    check: HealthIndicatorSession,
    error: AxiosError | any,
  ) {
    const response: { [key: string]: any } = {
      message: error.message,
    };

    if (error.response) {
      response.statusCode = error.response.status;
      response.statusText = error.response.statusText;
    }

    return check.down(response);
  }

  /**
   * Checks if the given url response in the given timeout
   * and returns a result object corresponding to the result
   * @param key The key which will be used for the result object
   * @param url The url which should be request
   * @param options Optional axios options
   *
   * @example
   * httpHealthIndicator.pingCheck('google', 'https://google.com', { timeout: 800 })
   *
   * @deprecated Use `FetchHealthIndicator.pingCheck()` instead, e.g.
   * `fetchHealthIndicator.pingCheck('google', 'https://google.com').withTimeout(800)`.
   * Removed in v13.
   */
  async pingCheck<Key extends string>(
    key: Key,
    url: URL | string,
    {
      httpClient,
      ...options
    }: AxiosRequestConfig & { httpClient?: HttpClientLike } = {},
  ): Promise<HealthIndicatorResult<Key>> {
    const check = this.healthIndicatorService.check(key);

    const httpService = httpClient || (await this.getHttpService());

    try {
      await lastValueFrom(
        httpService.request({ url: url.toString(), ...options }),
      );
    } catch (err) {
      if (isAxiosError(err)) {
        return this.generateHttpError(check, err);
      }

      throw err;
    }

    return check.up();
  }

  /**
   * Checks the response of the given url with `callback`
   *
   * @deprecated Use `FetchHealthIndicator.pingCheck()` with the `verify`
   * option instead, e.g.
   * `fetchHealthIndicator.pingCheck('api', url, { verify: (res) => res.status === 204 })`.
   * Removed in v13.
   */
  async responseCheck<T, Key extends string>(
    key: Key,
    url: URL | string,
    callback: (response: AxiosResponse<T>) => boolean | Promise<boolean>,
    {
      httpClient,
      ...options
    }: AxiosRequestConfig & { httpClient?: HttpClientLike } = {},
  ): Promise<HealthIndicatorResult<Key>> {
    const check = this.healthIndicatorService.check(key);
    const httpService = httpClient || (await this.getHttpService());

    let response: AxiosResponse;
    let axiosError: AxiosError | null = null;

    try {
      response = await lastValueFrom(
        httpService.request({ url: url.toString(), ...options }),
      );
    } catch (error) {
      if (!isAxiosError(error)) {
        throw error;
      }
      // We received an Axios Error but no response for unknown reasons.
      if (!error.response) {
        return check.down(error.message);
      }

      // We store the response no matter if the http request was successful or not.
      // So that we can pass it to the callback function and the user can decide
      // if the response is healthy or not.
      response = error.response;
      axiosError = error;
    }

    const isHealthy = await callback(response);

    if (!isHealthy) {
      if (axiosError) {
        return this.generateHttpError(check, axiosError);
      }

      return check.down();
    }

    return check.up();
  }
}

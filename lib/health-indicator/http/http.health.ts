import { type URL } from 'url';
import type * as NestJSAxios from '@nestjs/axios';
import { ConsoleLogger, Inject, Injectable, Scope } from '@nestjs/common';
import { lastValueFrom, type Observable } from 'rxjs';
import { type HealthIndicatorResult } from '..';
import {
  type AxiosRequestConfig,
  type AxiosResponse,
} from './axios.interfaces';
import { type AxiosError } from '../../errors/axios.error';
import { TERMINUS_LOGGER } from '../../terminus.constants';
import { checkPackages, isAxiosError } from '../../utils';
import {
  HealthIndicatorService,
  type HealthIndicatorSession,
} from '../health-indicator.service';

interface HttpClientLike {
  request<T = any>(config: any): Observable<AxiosResponse<T>>;
}

/**
 * The HTTPHealthIndicator contains health indicators
 * which are used for health checks related to HTTP requests
 *
 * @publicApi
 * @module TerminusModule
 */
@Injectable({
  scope: Scope.TRANSIENT,
})
export class HttpHealthIndicator {
  private nestJsAxios!: typeof NestJSAxios;

  constructor(
    @Inject(TERMINUS_LOGGER)
    private readonly logger: ConsoleLogger,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {
    if (this.logger instanceof ConsoleLogger) {
      this.logger.setContext(HttpHealthIndicator.name);
    }
    this.checkDependantPackages();
  }

  /**
   * Checks if the dependant packages are present
   */
  private checkDependantPackages() {
    this.nestJsAxios = checkPackages(
      ['@nestjs/axios'],
      this.constructor.name,
    )[0];
  }

  /**
   * Returns a plain, unconfigured `HttpService` backed by the default axios
   * instance. This intentionally does not look up any `HttpService` a user
   * may have registered elsewhere in their application (e.g. via
   * `HttpModule.register(...)`) - doing so via a global, unscoped DI lookup
   * previously let a health check silently pick up an unrelated module's
   * configured axios instance (wrong baseURL, headers, interceptors, etc.).
   * Pass a `httpClient` explicitly to `pingCheck`/`responseCheck` if you want
   * to reuse your own preconfigured client.
   */
  private getHttpService(): HttpClientLike {
    return new this.nestJsAxios.HttpService();
  }

  /**
   * Prepares and throw a HealthCheckError
   * @param key The key which will be used for the result object
   * @param error The thrown error
   *
   * @throws {HealthCheckError}
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
   * @throws {HealthCheckError} In case the health indicator failed
   *
   * @example
   * httpHealthIndicator.pingCheck('google', 'https://google.com', { timeout: 800 })
   */
  async pingCheck<Key extends string>(
    key: Key,
    url: string,
    {
      httpClient,
      ...options
    }: AxiosRequestConfig & { httpClient?: HttpClientLike } = {},
  ): Promise<HealthIndicatorResult<Key>> {
    const check = this.healthIndicatorService.check(key);

    // In case the user has a preconfigured HttpService (see `HttpModule.register`)
    // we just let him/her pass in this HttpService so that he/she does not need to
    // reconfigure it.
    // https://github.com/nestjs/terminus/issues/1151
    const httpService = httpClient || this.getHttpService();

    try {
      await lastValueFrom(httpService.request({ url, ...options }));
    } catch (err) {
      if (isAxiosError(err)) {
        return this.generateHttpError(check, err);
      }

      throw err;
    }

    return check.up();
  }

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
    const httpService = httpClient || this.getHttpService();

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

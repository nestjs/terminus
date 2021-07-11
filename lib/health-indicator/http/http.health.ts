import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse, AxiosRequestConfig, AxiosError } from 'axios';
import { HealthIndicator, HealthIndicatorResult } from '..';
import { HealthCheckError } from '../../health-check/health-check.error';
import { lastValueFrom } from 'rxjs';

/**
 * The HTTPHealthIndicator contains health indicators
 * which are used for health checks related to HTTP requests
 *
 * @publicApi
 * @module TerminusModule
 */
@Injectable()
export class HttpHealthIndicator extends HealthIndicator {
  /**
   * Initializes the health indicator
   * @param httpService The HttpService provided by Nest
   */
  constructor(private readonly httpService: HttpService) {
    super();
  }

  /**
   * Prepares and throw a HealthCheckError
   * @param key The key which will be used for the result object
   * @param error The thrown error
   *
   * @throws {HealthCheckError}
   */
  private generateHttpError(key: string, error: AxiosError) {
    // TODO: Check for `error.isAxiosError`
    // Upgrade axios for that as soon ^0.19.0 is released
    if (error) {
      const response: { [key: string]: any } = {
        message: error.message,
      };
      if (error.response) {
        response.statusCode = error.response.status;
        response.statusText = error.response.statusText;
      }
      throw new HealthCheckError(
        error.message,
        this.getStatus(key, false, response),
      );
    }
  }

  /**
   * Checks if the given url respons in the given timeout
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
  async pingCheck(
    key: string,
    url: string,
    {
      httpClient,
      ...options
    }: AxiosRequestConfig & { httpClient?: HttpService } = {},
  ): Promise<HealthIndicatorResult> {
    let isHealthy = false;
    // In case the user has a preconfigured HttpService (see `HttpModule.register`)
    // we just let him/her pass in this HttpService so that he/she does not need to
    // reconfigure it.
    // https://github.com/nestjs/terminus/issues/1151
    const httpService = httpClient || this.httpService;

    try {
      await httpService.request({ url, ...options }).toPromise();
      isHealthy = true;
    } catch (err) {
      this.generateHttpError(key, err);
    }

    return this.getStatus(key, isHealthy);
  }

  async responseCheck<T>(
    key: string,
    url: URL | string,
    callback: (response: AxiosResponse<T>) => boolean | Promise<boolean>,
    {
      httpClient,
      ...options
    }: AxiosRequestConfig & { httpClient?: HttpService } = {},
  ): Promise<HealthIndicatorResult> {
    const httpService = httpClient || this.httpService;

    try {
      const response = lastValueFrom(httpService
        .request({ url: url.toString(), ...options })
      );

      const isHealthy = await callback(await response);

      if (!isHealthy) {
        throw new HealthCheckError(
          `${key} is not available`,
          this.getStatus(key, false),
        );
      }

      return this.getStatus(key, isHealthy);
    } catch (err) {
      if (err.isAxiosError) {
        throw this.generateHttpError(key, err);
      }

      if (err instanceof HealthCheckError) {
        throw err;
      }

      throw new HealthCheckError(err.message, this.getStatus(key, false));
    }
  }
}

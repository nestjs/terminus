import { Injectable, HttpService, Scope } from '@nestjs/common';
import { AxiosResponse, AxiosRequestConfig, AxiosError } from 'axios';
import { HealthIndicator, HealthIndicatorResult } from '../';
import { HealthCheckError } from '../../health-check/health-check.error';
import * as deprecate from 'deprecate';

/**
 * The DNSHealthIndicator contains health indicators
 * which are used for health checks related to HTTP requests
 * and DNS
 *
 * @publicApi
 * @module TerminusModule
 * @deprecated
 */
@Injectable({ scope: Scope.TRANSIENT })
export class DNSHealthIndicator extends HealthIndicator {
  /**
   * Initializes the health indicator
   * @param httpService The HttpService provided by Nest
   */
  constructor(private readonly httpService: HttpService) {
    super();
    deprecate(
      'DNSHealthIndicator',
      'Simply search and replace "DNSHealthIndicator" with "HttpHealthIndicator" in order to upgrade. DNSHealthIndicator will be removed in version 8.x.x',
    );
  }

  /**
   * Executes a request with the given parameters
   * @param url The url of the health check
   * @param options The optional axios options of the request
   */
  private async pingDNS(
    url: string,
    options: AxiosRequestConfig,
  ): Promise<AxiosResponse<any> | any> {
    return await this.httpService.request({ url, ...options }).toPromise();
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
   * dnsHealthIndicator.pingCheck('google', 'https://google.com', { timeout: 800 })
   */
  async pingCheck(
    key: string,
    url: string,
    options: AxiosRequestConfig = {},
  ): Promise<HealthIndicatorResult> {
    let isHealthy = false;

    try {
      await this.pingDNS(url, options);
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
    options: AxiosRequestConfig = {},
  ): Promise<HealthIndicatorResult> {
    try {
      const response = await this.httpService
        .request({ url: url.toString(), ...options })
        .toPromise();

      const isHealthy = await callback(response);

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

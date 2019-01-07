import { Injectable, HttpService } from '@nestjs/common';
import { HealthIndicatorResult } from '../../interfaces';
import { AxiosResponse, AxiosRequestConfig, AxiosError } from 'axios';
import { HealthIndicator } from '../abstract/health-indicator';
import { HealthCheckError } from '@godaddy/terminus';

/**
 * The DNSHealthIndicator contains health indicators
 * which are used for health checks related to HTTP requests
 * and DNS
 */
@Injectable()
export class DNSHealthIndicator extends HealthIndicator {
  /**
   * Initializes the health indicator
   * @param httpService The HttpService provided by Nest
   */
  constructor(private readonly httpService: HttpService) {
    super();
  }

  /**
   * Executes a request with the given parameters
   * @param url The url of the health check
   * @param options The optional axios options of the request
   */
  private async pingDNS(
    url: string,
    options: AxiosRequestConfig,
  ): Promise<AxiosResponse<unknown> | unknown> {
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
      let statusCode: number;
      let statusText: string;
      if (error.response) {
        statusCode = error.response.status;
        statusText = error.response.statusText;
      }
      throw new HealthCheckError(
        error.message,
        this.getStatus(key, false, {
          message: error.message,
          statusCode,
          statusText,
        }),
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
   * ```TypeScript
   * dnsHealthIndicator.pingCheck('google', 'https://google.com', { timeout: 800 })
   * ```
   */
  async pingCheck(
    key: string,
    url: string,
    options?: AxiosRequestConfig,
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
}

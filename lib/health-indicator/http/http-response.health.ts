import { HealthCheckError } from '../../health-check/health-check.error';
import { AxiosResponse, AxiosRequestConfig, AxiosError } from 'axios';
import { HttpService, Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '../';

/**
 * The HttpResponseHealthIndicator is a health indicators which is used for health checks 
 * that reference some property of an HTTP response.
 *
 * @publicApi
 * @module TerminusModule
 */
@Injectable()
export class HttpResponseHealthIndicator extends HealthIndicator {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async checkResponse<T>(
    key: string,
    url: URL | string,
    callback: (response: AxiosResponse<T>) => boolean | Promise<boolean>,
    options: AxiosRequestConfig = {},
  ): Promise<HealthIndicatorResult> {
    try {
      const response = await this.httpService.request({ url: url.toString(), ...options }).toPromise();

      const isHealthy = await callback(response)

      if (!isHealthy) {
        throw new HealthCheckError(
          `${key} is not available`, 
          this.getStatus(key, false));
      }
      
      return this.getStatus(key, isHealthy);
    } catch (err) {
      if (err.isAxiosError) {
        throw this.generateHttpError(key, err);
      }

      if (err instanceof HealthCheckError) {
        throw err
      }

      throw new HealthCheckError(err.message, this.getStatus(key, false));
    }
  }
  
  /**
   * Prepares and returns a HealthCheckError
   * @param key The key which will be used for the result object
   * @param error The thrown error
   *
   * @returns {HealthCheckError}
   */
  private generateHttpError(key: string, error: AxiosError): HealthCheckError {
    const response: { [key: string]: any } = {
      message: error.message,
    };

    if (error.response) {
      response.statusCode = error.response.status;
      response.statusText = error.response.statusText;
    }

    return new HealthCheckError(
      error.message,
      this.getStatus(key, false, response),
    );
  }
}

import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult } from '../../interfaces';
import { HealthIndicator } from '../abstract/health-indicator';
import { HealthCheckError } from '@godaddy/terminus';
import { ClientProxyFactory, ClientOptions } from '@nestjs/microservices';
import {
  promiseTimeout,
  TimeoutError as PromiseTimeoutError,
} from '../../utils';
import { TimeoutError } from '../../errors';

export type MicroserviceHealthIndicatorOptions = ClientOptions & {
  timeout?: number;
};

/**
 * The MicroserviceHealthIndicator is a health indicators
 * which is used for health checks related to microservices
 */
@Injectable()
export class MicroserviceHealthIndicator extends HealthIndicator {
  /**
   * Initializes the health indicator
   */
  constructor() {
    super();
  }

  private async pingMicroservice(
    options: MicroserviceHealthIndicatorOptions,
  ): Promise<any> {
    const client = ClientProxyFactory.create(options);
    return await client.connect();
  }

  /**
   * Prepares and throw a HealthCheckError
   * @param key The key which will be used for the result object
   * @param error The thrown error
   * @param timeout The timeout in ms
   *
   * @throws {HealthCheckError}
   */
  private generateError(key: string, error: Error, timeout: number) {
    if (!error) {
      return;
    }
    if (error instanceof PromiseTimeoutError) {
      throw new TimeoutError(
        timeout,
        this.getStatus(key, false, {
          message: `timeout of ${timeout}ms exceeded`,
        }),
      );
    }
    throw new HealthCheckError(
      error.message,
      this.getStatus(key, false, {
        message: error.message,
      }),
    );
  }

  /**
   * Checks if the given microservice is up
   * @param key The key which will be used for the result object
   * @param options The options of the microservice
   *
   * @throws {HealthCheckError} If the microservice is not reachable
   *
   * @example
   * ```TypeScript
   * microservice.pingCheck('tcp', {
   *   transport: Transport.TCP,
   *   options: { host: 'localhost', port: 3001 },
   * })
   * ```
   */
  async pingCheck(
    key: string,
    options: MicroserviceHealthIndicatorOptions,
  ): Promise<HealthIndicatorResult> {
    let isHealthy = false;
    const timeout = options.timeout || 1000;

    try {
      await promiseTimeout(timeout, this.pingMicroservice(options));
      isHealthy = true;
    } catch (err) {
      this.generateError(key, err, timeout);
    }

    return this.getStatus(key, isHealthy);
  }
}

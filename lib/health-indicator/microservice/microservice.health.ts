import { Injectable, Scope } from '@nestjs/common';
import type * as NestJSMicroservices from '@nestjs/microservices';
import { HealthIndicator, type HealthIndicatorResult } from '../';
import { TimeoutError } from '../../errors';
import { HealthCheckError } from '../../health-check/health-check.error';
import {
  checkPackages,
  promiseTimeout,
  TimeoutError as PromiseTimeoutError,
  type PropType,
  isError,
} from '../../utils';

// Since @nestjs/microservices is lazily loaded we are not able to use
// its types. It would end up in the d.ts file if we would use the types.
// In case the user does not use this HealthIndicator and therefore has not
// @nestjs/microservices installed, TS would complain.
// To workaround this, we try to be as type-secure as possible, without
// duplicating the interfaces.
// That is why the user has to pass the options as Type Param.
interface MicroserviceOptionsLike {
  transport?: number;
  options?: object;
}

/**
 * The options for the `MicroserviceHealthIndicator`
 */
export type MicroserviceHealthIndicatorOptions<
  T extends MicroserviceOptionsLike = MicroserviceOptionsLike,
> = {
  // The transport option is in the `MicroserviceOptionsLike` (e.g. RedisOptions)
  // optional. We need to use this information, therefore it is required
  transport: Required<PropType<MicroserviceOptionsLike, 'transport'>>;
  timeout?: number;
} & Partial<T>;

/**
 * The MicroserviceHealthIndicator is a health indicators
 * which is used for health checks related to microservices
 *
 * @publicApi
 * @module TerminusModule
 */
@Injectable({ scope: Scope.TRANSIENT })
export class MicroserviceHealthIndicator extends HealthIndicator {
  private nestJsMicroservices!: typeof NestJSMicroservices;
  /**
   * Initializes the health indicator
   */
  constructor() {
    super();
    this.checkDependantPackages();
  }

  /**
   * Checks if the dependant packages are present
   */
  private checkDependantPackages() {
    this.nestJsMicroservices = checkPackages(
      ['@nestjs/microservices'],
      this.constructor.name,
    )[0];
  }

  private async pingMicroservice<
    MicroserviceClientOptions extends MicroserviceOptionsLike,
  >(
    options: MicroserviceHealthIndicatorOptions<MicroserviceClientOptions>,
  ): Promise<void> {
    const client = this.nestJsMicroservices.ClientProxyFactory.create(options);
    const checkConnection = async () => {
      await client.connect();
      await client.close();
    };
    return await checkConnection();
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
   * microservice.pingCheck<TcpClientOptions>('tcp', {
   *   transport: Transport.TCP,
   *   options: { host: 'localhost', port: 3001 },
   * })
   */
  async pingCheck<MicroserviceClientOptions extends MicroserviceOptionsLike>(
    key: string,
    options: MicroserviceHealthIndicatorOptions<MicroserviceClientOptions>,
  ): Promise<HealthIndicatorResult> {
    let isHealthy = false;
    const timeout = options.timeout || 1000;

    if (options.transport === this.nestJsMicroservices.Transport.KAFKA) {
      options.options = {
        // We need to set the producerOnlyMode to true in order to speed
        // up the connection process. https://github.com/nestjs/terminus/issues/1690
        producerOnlyMode: true,
        ...options.options,
      };
    }

    try {
      await promiseTimeout(timeout, this.pingMicroservice(options));
      isHealthy = true;
    } catch (err) {
      if (isError(err)) {
        this.generateError(key, err, timeout);
      }

      const errorMsg = `${key} is not available`;

      throw new HealthCheckError(
        errorMsg,
        this.getStatus(key, false, { message: errorMsg }),
      );
    }

    return this.getStatus(key, isHealthy);
  }
}

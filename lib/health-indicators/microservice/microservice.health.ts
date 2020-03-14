import { HealthCheckError } from '@godaddy/terminus';
import { Injectable, Scope } from '@nestjs/common';
import * as NestJSMicroservices from '@nestjs/microservices';
import {
  GrpcOptions,
  MqttOptions,
  NatsOptions,
  RedisOptions,
  RmqOptions,
  TcpOptions,
} from '@nestjs/microservices';
import { TimeoutError } from '../../errors';
import { HealthIndicatorResult } from '../../interfaces';
import {
  checkPackages,
  promiseTimeout,
  TimeoutError as PromiseTimeoutError,
} from '../../utils';
import { HealthIndicator } from '../health-indicator';

type ClientOptions =
  | RedisOptions
  | NatsOptions
  | MqttOptions
  | GrpcOptions
  | TcpOptions
  | RmqOptions;

/**
 * The options for the `MicroserviceHealthInidcator`
 */
export type MicroserviceHealthIndicatorOptions = ClientOptions & {
  timeout?: number;
};

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

  private async pingMicroservice(
    options: MicroserviceHealthIndicatorOptions,
  ): Promise<any> {
    const client = this.nestJsMicroservices.ClientProxyFactory.create(
      options as any,
    );
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
   * microservice.pingCheck('tcp', {
   *   transport: Transport.TCP,
   *   options: { host: 'localhost', port: 3001 },
   * })
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

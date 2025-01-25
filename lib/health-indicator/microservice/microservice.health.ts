import { Injectable, Scope } from '@nestjs/common';
import type * as NestJSMicroservices from '@nestjs/microservices';
import { type HealthIndicatorResult } from '../';
import {
  checkPackages,
  promiseTimeout,
  TimeoutError as PromiseTimeoutError,
  type PropType,
  isError,
} from '../../utils';
import { HealthIndicatorService } from '../health-indicator.service';

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
export class MicroserviceHealthIndicator {
  private nestJsMicroservices!: typeof NestJSMicroservices;

  constructor(private readonly healthIndicatorService: HealthIndicatorService) {
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
  async pingCheck<
    MicroserviceClientOptions extends MicroserviceOptionsLike,
    Key extends string = string,
  >(
    key: Key,
    options: MicroserviceHealthIndicatorOptions<MicroserviceClientOptions>,
  ): Promise<HealthIndicatorResult<Key>> {
    const check = this.healthIndicatorService.check(key);
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
    } catch (err) {
      if (err instanceof PromiseTimeoutError) {
        return check.down(`timeout of ${timeout}ms exceeded`);
      }
      if (isError(err)) {
        return check.down(err.message);
      }

      return check.down(`${key} is not available`);
    }

    return check.up();
  }
}

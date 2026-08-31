import { Injectable, Scope } from '@nestjs/common';
import type * as NestJSMicroservices from '@nestjs/microservices';
import {
  assertPackages,
  loadPackage,
  type PropType,
  isError,
} from '../../utils/index.js';
import {
  type HealthCheckAttempt,
  HealthIndicatorService,
} from '../health-indicator.service.js';

// Since @nestjs/microservices is lazily loaded we are not able to use
// its types. It would end up in the d.ts file if we would use the types.
// In case the user does not use this HealthIndicator and therefore has not
// @nestjs/microservices installed, TS would complain.
// To workaround this, we try to be as type-secure as possible, without
// duplicating the interfaces.
// That is why the user has to pass the options as Type Param.
interface MicroserviceOptionsLike {
  transport?: number;
  options?: object & { queue?: string };
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
  /**
   * The amount of time the check should require in ms
   * @deprecated Chain `.withTimeout(ms)` on the returned attempt instead,
   * e.g. `microservice.pingCheck('tcp', options).withTimeout(1500)`
   */
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
  constructor(private readonly healthIndicatorService: HealthIndicatorService) {
    assertPackages(['@nestjs/microservices'], this.constructor.name);
  }

  /**
   * Loads `@nestjs/microservices`, which is only an optional peer
   */
  private async loadMicroservices(): Promise<typeof NestJSMicroservices> {
    return await loadPackage('@nestjs/microservices');
  }

  private async pingMicroservice<
    MicroserviceClientOptions extends MicroserviceOptionsLike,
  >(
    options: MicroserviceHealthIndicatorOptions<MicroserviceClientOptions>,
  ): Promise<void> {
    const { ClientProxyFactory } = await this.loadMicroservices();
    const client = ClientProxyFactory.create(options);
    try {
      await client.connect();
    } finally {
      await client.close();
    }
  }

  /**
   * Checks if the given microservice is up
   * @param key The key which will be used for the result object
   * @param options The options of the microservice
   *
   * @example
   * microservice.pingCheck<TcpClientOptions>('tcp', {
   *   transport: Transport.TCP,
   *   options: { host: 'localhost', port: 3001 },
   * })
   */
  pingCheck<
    MicroserviceClientOptions extends MicroserviceOptionsLike,
    Key extends string = string,
  >(
    key: Key,
    options: MicroserviceHealthIndicatorOptions<MicroserviceClientOptions>,
  ): HealthCheckAttempt<Key> {
    return this.healthIndicatorService
      .check(key)
      .attempt(async () => {
        const { Transport } = await this.loadMicroservices();

        // A probe only connects, so it must be cheap and leave nothing behind:
        // https://github.com/nestjs/terminus/issues/1690
        // https://github.com/nestjs/terminus/issues/2680
        const probeDefaults: Record<number, object> = {
          [Transport.KAFKA]: { producerOnlyMode: true },
          [Transport.RMQ]: { noAssert: options.options?.queue == null },
        };
        const clientOptions: MicroserviceHealthIndicatorOptions<MicroserviceClientOptions> =
          {
            ...options,
            options: {
              ...probeDefaults[options.transport as number],
              ...options.options,
            },
          };

        try {
          await this.pingMicroservice(clientOptions);
        } catch (err) {
          throw isError(err) ? err : new Error(`${key} is not available`);
        }
      })
      .withTimeout(options.timeout ?? 1000);
  }
}

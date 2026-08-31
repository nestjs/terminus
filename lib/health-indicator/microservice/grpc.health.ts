import { join } from 'node:path';
import { Injectable, type OnApplicationShutdown, Scope } from '@nestjs/common';
import type * as NestJSMicroservices from '@nestjs/microservices';
import { lastValueFrom, type Observable } from 'rxjs';
import { type HealthIndicatorResult } from '../../index.js';
import {
  assertPackages,
  isError,
  loadPackage,
  type PropType,
} from '../../utils/index.js';
import { HealthIndicatorService } from '../health-indicator.service.js';

/**
 * The status of the request service
 * @internal
 */
enum ServingStatus {
  UNKNOWN = 0,
  SERVING = 1,
  NOT_SERVING = 2,
  SERVICE_UNKNOWN = 3,
}

/**
 * The interface for the GRPC HealthService check request
 * @internal
 */
interface HealthCheckRequest {
  service: string;
}

/**
 * The response of the health check
 * @internal
 */
interface HealthCheckResponse {
  status: ServingStatus;
}

/**
 * The interface of the default GRPC HealthService,
 * according to the GRPC specs
 */
interface GRPCHealthService {
  check(data: HealthCheckRequest): Observable<HealthCheckResponse>;
}

/**
 * The function to check whether the service is up or down
 */
export type HealthServiceCheck = (
  healthService: any,
  service: string,
) => Promise<any>;

// Since @nestjs/microservices is lazily loaded we are not able to use
// its types. It would end up in the d.ts file if we would use the types.
// In case the user does not use this HealthIndicator and therefore has not
// @nestjs/microservices installed, TS would complain.
// To workaround this, we try to be as type-secure as possible, without
// duplicating the interfaces.
// That is why the user has to pass the options as Type Param
interface GrpcClientOptionsLike {
  transport?: number;
  options?: any;
}

type GrpcOptionsLike<
  GrpcClientOptions extends GrpcClientOptionsLike = GrpcClientOptionsLike,
> = PropType<GrpcClientOptions, 'options'>;

/**
 * The options for the `grpc.checkService` health indicator function
 */
export type CheckGRPCServiceOptions<
  GrpcOptions extends GrpcClientOptionsLike = GrpcClientOptionsLike,
> = Partial<GrpcOptionsLike<GrpcOptions>> & {
  timeout?: number;
  healthServiceName?: string;
  healthServiceCheck?: HealthServiceCheck;
};

/**
 * The `GRPCHealthIndicator` is used for health checks
 * related to GRPC
 *
 * @publicApi
 * @module TerminusModule
 */
@Injectable({ scope: Scope.TRANSIENT })
export class GRPCHealthIndicator implements OnApplicationShutdown {
  /**
   * One client per result key, kept open across probes: a gRPC channel
   * references itself through its timers, so a new one per check leaks.
   */
  private readonly clients = new Map<
    string,
    NestJSMicroservices.ClientGrpcProxy
  >();

  constructor(private readonly healthIndicatorService: HealthIndicatorService) {
    assertPackages(
      ['@nestjs/microservices', '@grpc/grpc-js', '@grpc/proto-loader'],
      this.constructor.name,
    );
  }

  onApplicationShutdown() {
    for (const client of this.clients.values()) {
      client.close();
    }
    this.clients.clear();
  }

  private async getClient(
    key: string,
    options: CheckGRPCServiceOptions,
  ): Promise<NestJSMicroservices.ClientGrpcProxy> {
    let client = this.clients.get(key);
    if (!client) {
      const { ClientProxyFactory, Transport }: typeof NestJSMicroservices =
        await loadPackage('@nestjs/microservices');
      const {
        timeout: _t,
        healthServiceName: _hS,
        healthServiceCheck: _hSC,
        ...grpcOptions
      } = options;
      client = ClientProxyFactory.create({
        transport: Transport.GRPC,
        options: grpcOptions as NestJSMicroservices.GrpcOptions['options'],
      });
      this.clients.set(key, client);
    }
    return client;
  }

  /**
   * Checks if the given service is up using the standard health check
   * specification of GRPC.
   *
   * https://github.com/grpc/grpc/blob/master/doc/health-checking.md
   *
   * @param {string} key The key which will be used for the result object
   * @param {string} service The service which should be checked
   * @param {CheckGRPCOptions} [options] Configuration for the request
   *
   * @example
   * grpc.checkService<GrpcOptions>('hero_service', 'hero.health.v1')
   *
   * @example
   * // Change the timeout
   * grpc.checkService<GrpcOptions>('hero_service', 'hero.health.v1', { timeout: 300 })
   *
   * @example
   * // You can customize the health check
   * // by giving these options. Nonetheless it is still seen
   * // as best practice to implement the recommended GRPC specs
   * grpc.checkService<GrpcOptions>('hero_service', 'hero.health.v1', {
   *   timeout: 500,
   *   package: 'grpc.health.v2',
   *   protoPath: join(import.meta.dirname, './protos/my-custom-health.v1'),
   *   // The name of the service you need for the health check
   *   healthServiceName: 'Health',
   *   // Your custom function which checks the service
   *   healthServiceCheck: (healthService: any, service: string) =>
   *     lastValueFrom(healthService.check({ service })),
   * })
   */
  async checkService<
    GrpcOptions extends GrpcClientOptionsLike = GrpcClientOptionsLike,
    Key extends string = string,
  >(
    key: Key,
    service: string,
    options: CheckGRPCServiceOptions<GrpcOptions> = {},
  ): Promise<HealthIndicatorResult<Key>> {
    const check = this.healthIndicatorService.check(key);

    const settings: Required<CheckGRPCServiceOptions> = {
      package: 'grpc.health.v1',
      protoPath: join(import.meta.dirname, './protos/health.proto'),
      healthServiceCheck: (healthService: GRPCHealthService, service: string) =>
        lastValueFrom(healthService.check({ service })),
      timeout: 1000,
      healthServiceName: 'Health',
      ...options,
    };

    let healthService: GRPCHealthService;
    try {
      const client = await this.getClient(key, settings);
      healthService = client.getService<GRPCHealthService>(
        settings.healthServiceName,
      );
    } catch (err) {
      // A TypeError here is a wiring mistake in the options, not an unhealthy upstream
      if (err instanceof TypeError) {
        throw err;
      }
      return check.down(isError(err) ? err.message : String(err));
    }

    return check
      .attempt(async () => {
        const response: HealthCheckResponse = await settings.healthServiceCheck(
          healthService,
          service,
        );
        const servingStatus = ServingStatus[response.status] ?? response.status;
        if (response.status !== ServingStatus.SERVING) {
          throw new Error(`serving status: ${servingStatus}`);
        }
        return { statusCode: response.status, servingStatus };
      })
      .withTimeout(settings.timeout);
  }
}

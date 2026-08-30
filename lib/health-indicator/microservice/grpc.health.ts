import { join } from 'node:path';
import { Injectable, Scope } from '@nestjs/common';
import type * as NestJSMicroservices from '@nestjs/microservices';
import { type Observable } from 'rxjs';
import { type HealthIndicatorResult } from '../../index.js';
import {
  assertPackages,
  isError,
  loadPackage,
  promiseTimeout,
  type PropType,
  TimeoutError as PromiseTimeoutError,
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
export class GRPCHealthIndicator {
  /**
   * Initializes the health indicator
   */
  constructor(private readonly healthIndicatorService: HealthIndicatorService) {
    assertPackages(
      ['@nestjs/microservices', '@grpc/grpc-js', '@grpc/proto-loader'],
      this.constructor.name,
    );
  }

  /**
   * A cache of open channels for the health indicator
   * This is used to prevent opening new channels for every health check
   */
  private readonly openChannels = new Map<string, GRPCHealthService>();

  /**
   * Creates a GRPC client from the given options
   * @private
   */
  private async createClient<GrpcOptions extends GrpcClientOptionsLike>(
    options: CheckGRPCServiceOptions<GrpcOptions>,
  ): Promise<NestJSMicroservices.ClientGrpc> {
    const { ClientProxyFactory }: typeof NestJSMicroservices =
      await loadPackage('@nestjs/microservices');
    const {
      // Remove the options which are not needed for the client
      timeout: _t,
      healthServiceName: _hS,
      healthServiceCheck: _hSC,

      ...grpcOptions
    } = options;
    return ClientProxyFactory.create({
      transport: 4,
      options: grpcOptions as any,
    });
  }

  async getHealthService(
    service: string,
    settings: CheckGRPCServiceOptions<GrpcClientOptionsLike>,
  ) {
    if (this.openChannels.has(service)) {
      return this.openChannels.get(service)!;
    }

    const client =
      await this.createClient<NestJSMicroservices.GrpcOptions>(settings);
    const healthService = client.getService<GRPCHealthService>(
      settings.healthServiceName as string,
    );

    this.openChannels.set(service, healthService);
    return healthService;
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
   *     healthService.check({ service }).toPromise(),
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

    const defaultOptions: CheckGRPCServiceOptions<GrpcOptions> = {
      package: 'grpc.health.v1',
      protoPath: join(import.meta.dirname, './protos/health.proto'),
      healthServiceCheck: (healthService: GRPCHealthService, service: string) =>
        healthService.check({ service }).toPromise(),
      timeout: 1000,
      healthServiceName: 'Health',
    };

    const settings = { ...defaultOptions, ...options };

    let healthService: GRPCHealthService;
    try {
      healthService = await this.getHealthService(service, settings);
    } catch (err) {
      if (err instanceof TypeError) {
        throw err;
      }
      if (isError(err)) {
        return check.down(err.message);
      }
      if (typeof err === 'string') {
        return check.down(err);
      }

      return check.down();
    }

    let response: HealthCheckResponse;

    try {
      response = await promiseTimeout(
        settings.timeout as number,
        (settings.healthServiceCheck as HealthServiceCheck)(
          healthService,
          service,
        ),
      );
    } catch (err) {
      if (err instanceof PromiseTimeoutError) {
        return check.down(`timeout of ${settings.timeout}ms exceeded`);
      }
      if (isError(err)) {
        return check.down(err.message);
      }
      if (typeof err === 'string') {
        return check.down(err);
      }

      return check.down();
    }

    const isHealthy = response.status === ServingStatus.SERVING;

    if (!isHealthy) {
      return check.down({
        statusCode: response.status,
        servingStatus: ServingStatus[response.status],
      });
    }

    return check.up({
      statusCode: response.status,
      servingStatus: ServingStatus[response.status],
    });
  }
}

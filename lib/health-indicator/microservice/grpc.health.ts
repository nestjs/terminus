import { join } from 'node:path';
import {
  Injectable,
  type OnApplicationShutdown,
  type OnModuleInit,
  Scope,
} from '@nestjs/common';
import type * as NestJSMicroservices from '@nestjs/microservices';
import { lastValueFrom, type Observable } from 'rxjs';
import { NotServingError } from '../../errors/not-serving.error.js';
import { loadPackage, type PropType } from '../../utils/index.js';
import { HealthIndicatorService } from '../service/health-indicator.service.js';

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
  // FIXME: Delete the `timeout` option in v13, use `.withTimeout()` instead (#2823)
  /**
   * The amount of time the check should require in ms
   * @deprecated Chain `.withTimeout(ms)` on the returned attempt instead,
   * e.g. `grpc.checkService('hero_service', 'hero.health.v1').withTimeout(300)`
   */
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
export class GRPCHealthIndicator
  implements OnModuleInit, OnApplicationShutdown
{
  /**
   * One client per result key, kept open across probes: a gRPC channel
   * references itself through its timers, so a new one per check leaks.
   */
  private readonly clients = new Map<
    string,
    NestJSMicroservices.ClientGrpcProxy
  >();

  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  /**
   * Loads the optional peers, so that the bootstrap fails when they are
   * missing
   */
  async onModuleInit(): Promise<void> {
    await this.loadGrpc();
  }

  /**
   * Checks that `@nestjs/microservices`, `@grpc/grpc-js` and
   * `@grpc/proto-loader` are installed, in one call so that the error names
   * all three. Nest loads the last two itself when the first client is
   * created, and exits the process when they are missing.
   *
   * The gRPC names are variables on purpose, so that bundlers do not follow
   * the imports: Nest can only load these two from `node_modules`.
   */
  private async loadGrpc(): Promise<void> {
    const names = ['@grpc/grpc-js', '@grpc/proto-loader'];
    await loadPackage(
      ['@nestjs/microservices', ...names],
      () =>
        Promise.all([
          import('@nestjs/microservices'),
          ...names.map((name) => import(/* webpackIgnore: true */ name)),
        ]),
      this.constructor.name,
    );
  }

  /**
   * Loads `@nestjs/microservices`. It loads `@grpc/grpc-js` and
   * `@grpc/proto-loader` itself, when the first client is created
   */
  private async loadMicroservices(): Promise<typeof NestJSMicroservices> {
    return await loadPackage(
      ['@nestjs/microservices'],
      () => import('@nestjs/microservices'),
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
    // Load the package before looking the client up: the lookup and the `set`
    // below must not be separated by an `await`, or concurrent checks with
    // the same key each create a client and only the last one is ever closed
    const { ClientProxyFactory, Transport } = await this.loadMicroservices();
    let client = this.clients.get(key);
    if (!client) {
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
  checkService<
    GrpcOptions extends GrpcClientOptionsLike = GrpcClientOptionsLike,
    Key extends string = string,
  >(
    key: Key,
    service: string,
    options: CheckGRPCServiceOptions<GrpcOptions> = {},
  ) {
    const settings: Required<CheckGRPCServiceOptions> = {
      package: 'grpc.health.v1',
      healthServiceCheck: (healthService: GRPCHealthService, service: string) =>
        lastValueFrom(healthService.check({ service })),
      timeout: 1000,
      healthServiceName: 'Health',
      ...options,
      // Only read `import.meta.dirname` when it is needed: it is not set in a
      // CommonJS bundle, where the app has to pass its own copy of the proto
      protoPath:
        options.protoPath ?? join(import.meta.dirname, './protos/health.proto'),
    };

    return this.healthIndicatorService
      .check(key)
      .attempt(async () => {
        const client = await this.getClient(key, settings);
        const healthService = client.getService<GRPCHealthService>(
          settings.healthServiceName,
        );
        const response: HealthCheckResponse = await settings.healthServiceCheck(
          healthService,
          service,
        );
        const servingStatus = ServingStatus[response.status] ?? response.status;
        if (response.status !== ServingStatus.SERVING) {
          throw new NotServingError(response.status, servingStatus);
        }
        // A number, not `ServingStatus`: the enum is not exported, so apps
        // built with `declaration: true` could not name the result
        return { statusCode: response.status as number, servingStatus };
      })
      .withSuccessData((data) => data)
      .withFailureData(
        (
          error,
        ): {
          statusCode?: number;
          servingStatus?: string | number;
          code?: number;
        } => {
          // The fields of a success when the service answered, otherwise the
          // gRPC status code of the call (e.g. 14 for UNAVAILABLE)
          if (error instanceof NotServingError) {
            const { statusCode, servingStatus } = error;
            return { statusCode, servingStatus };
          }
          return { code: (error as { code?: number }).code };
        },
      )
      .withTimeout(settings.timeout);
  }
}

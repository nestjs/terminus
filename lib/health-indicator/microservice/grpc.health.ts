import { HealthCheckError } from '../../health-check/health-check.error';
import { Injectable, Scope } from '@nestjs/common';
import type * as NestJSMicroservices from '@nestjs/microservices';
import { join } from 'path';
import { Observable } from 'rxjs';
import {
  HealthIndicatorResult,
  TimeoutError,
  UnhealthyResponseCodeError,
} from '../..';
import {
  checkPackages,
  promiseTimeout,
  PropType,
  TimeoutError as PromiseTimeoutError,
} from '../../utils';
import { HealthIndicator } from '../health-indicator';

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
 * @internal
 */
type GrpcOptionsOptions = PropType<NestJSMicroservices.GrpcOptions, 'options'>;

/**
 * The function to check whether the service is up or down
 */
export type HealthServiceCheck = (
  healthService: any,
  service: string,
) => Promise<any>;

/**
 * The options for the `grpc.checkService` health indicator function
 */
export type CheckGRPCServiceOptions = Partial<GrpcOptionsOptions> & {
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
export class GRPCHealthIndicator extends HealthIndicator {
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
      ['@nestjs/microservices', 'grpc', '@grpc/proto-loader'],
      this.constructor.name,
    )[0];
  }

  /**
   * Creates a GRPC client from the given options
   * @private
   */
  private createClient(
    options: CheckGRPCServiceOptions,
  ): NestJSMicroservices.ClientGrpc {
    const {
      timeout,
      healthServiceName,
      healthServiceCheck,
      ...grpcOptions
    } = options;
    return this.nestJsMicroservices.ClientProxyFactory.create({
      transport: 4,
      options: grpcOptions as GrpcOptionsOptions,
    });
  }

  /**
   * Checks if the given service is up using the standart health check
   * specification of GRPC.
   *
   * https://github.com/grpc/grpc/blob/master/doc/health-checking.md
   *
   * @param {string} key The key which will be used for the result object
   * @param {string} service The service which should be checked
   * @param {CheckGRPCOptions} [options] Configuration for the request
   *
   * @example
   * grpc.checkService('hero_service', 'hero.health.v1')
   *
   * @example
   * // Change the timeout
   * grpc.checkService('hero_service', 'hero.health.v1', { timeout: 300 })
   *
   * @example
   * // You can customize the health check
   * // by giving these options. Nonetheless it is still seen
   * // as best practice to implement the recommended GRPC specs
   * grpc.checkService('hero_service', 'hero.health.v1', {
   *   timeout: 500,
   *   package: 'grpc.health.v2',
   *   protoPath: join(__dirname, './protos/my-custom-health.v1'),
   *   // The name of the service you need for the health check
   *   healthServiceName: 'Health',
   *   // Your custom function which checks the service
   *   healthServiceCheck: (healthService: any, service: string) =>
   *     healthService.check({ service }).toPromise(),
   * })
   *
   * @throws {HealthCheckError} Gets thrown in case a health check failed
   * @throws {TimeoutError} Gets thrown in case a health check exceeded the given timeout
   * @throws {UnhealthyResponseCodeError} Gets thrown in case the received response is unhealthy
   */
  async checkService(
    key: string,
    service: string,
    options: CheckGRPCServiceOptions = {},
  ): Promise<HealthIndicatorResult> {
    const defaultOptions: CheckGRPCServiceOptions = {
      package: 'grpc.health.v1',
      protoPath: join(__dirname, './protos/health.proto'),
      healthServiceCheck: (healthService: GRPCHealthService, service: string) =>
        healthService.check({ service }).toPromise(),
      timeout: 1000,
      healthServiceName: 'Health',
    };

    const settings = { ...defaultOptions, ...options };

    const client = this.createClient(settings);

    let healthService: GRPCHealthService;
    try {
      healthService = client.getService<GRPCHealthService | any>(
        settings.healthServiceName as string,
      );
    } catch (err) {
      if (err instanceof TypeError) throw err;
      throw new HealthCheckError(
        err.message,
        this.getStatus(key, false, { message: err.message }),
      );
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
        throw new TimeoutError(
          settings.timeout as number,
          this.getStatus(key, false, {
            message: `timeout of ${settings.timeout}ms exceeded`,
          }),
        );
      }
      throw new HealthCheckError(
        err.message,
        this.getStatus(key, false, { message: err.message }),
      );
    }

    const isHealthy = response.status === ServingStatus.SERVING;

    const status = this.getStatus(key, isHealthy, {
      statusCode: response.status,
      servingStatus: ServingStatus[response.status],
    });

    if (!isHealthy) {
      throw new UnhealthyResponseCodeError(
        `${response.status}, ${ServingStatus[response.status]}`,
        status,
      );
    }

    return status;
  }
}

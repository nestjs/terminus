import {
  Injectable,
  Inject,
  OnApplicationBootstrap,
  Logger,
} from '@nestjs/common';
import { TERMINUS_MODULE_OPTIONS, TERMINUS_LIB } from './terminus.constants';
import {
  TerminusModuleOptions,
  HealthIndicatorFunction,
  TerminusEndpoint,
} from './interfaces';
import { ApplicationReferenceHost } from '@nestjs/core';
import { Server } from 'http';
import { HealthCheckError, Terminus, HealthCheckMap } from '@godaddy/terminus';

/**
 * Bootstraps the third party Terminus library with the
 * configured Module options
 */
@Injectable()
export class TerminusBootstrapService implements OnApplicationBootstrap {
  /**
   * The http server of NestJS
   */
  private httpServer: Server;
  /**
   * The NestJS logger
   */
  private readonly logger = new Logger(TerminusBootstrapService.name, true);

  /**
   * Initializes the service
   * @param options The terminus module options
   * @param refHost The application reference host of NestJS which contains the http server instance
   * @param terminus The terminus instance
   */
  constructor(
    @Inject(TERMINUS_MODULE_OPTIONS)
    private readonly options: TerminusModuleOptions,
    @Inject(TERMINUS_LIB) private readonly terminus: Terminus,
    private readonly refHost: ApplicationReferenceHost,
  ) {}

  /**
   * Executes the given health indicators and stores the caused
   * errors and results
   * @param healthIndicators The health indicators which should get executed
   */
  private async executeHealthIndicators(
    healthIndicators: HealthIndicatorFunction[],
  ): Promise<{ results: unknown[]; errors: unknown[] }> {
    const results: unknown[] = [];
    const errors: unknown[] = [];
    await Promise.all(
      healthIndicators
        // Register all promises
        .map(healthIndicator => healthIndicator())
        .map((p: Promise<unknown>) =>
          p.catch((error: Error) => {
            if (error instanceof HealthCheckError) {
              errors.push(error.causes);
            } else {
              throw error;
            }
          }),
        )
        .map((p: Promise<unknown>) =>
          p.then((result: unknown) => result && results.push(result)),
        ),
    );

    return { results, errors };
  }

  /**
   * Logs an error message of terminus
   * @param message The log message
   * @param error The error which was thrown
   */
  private logError(message: string, error: HealthCheckError | Error) {
    if ((error as HealthCheckError).causes) {
      const healthError: HealthCheckError = error as HealthCheckError;
      message = `${message} ${JSON.stringify(healthError.causes)}`;
    }
    this.logger.error(message, error.stack);
  }

  /**
   * Logs the health check registration to the logger
   * @param healthChecks The health check map to log
   */
  private logHealthCheckRegister(healthChecks: HealthCheckMap) {
    Object.keys(healthChecks).forEach(endpoint =>
      this.logger.log(
        `Mapped {${endpoint}, GET} healthcheck route`,
        'TerminusExplorer',
      ),
    );
  }

  private getHealthCheckExecutor(
    endpoint: TerminusEndpoint,
  ): () => Promise<any> {
    return async () => {
      const { results, errors } = await this.executeHealthIndicators(
        endpoint.healthIndicators,
      );

      const info = (results || [])
        .concat(errors || [])
        .reduce(
          (previous: Object, current: Object) =>
            Object.assign(previous, current),
          {},
        );

      if (errors.length) {
        throw new HealthCheckError('Healthcheck failed', info);
      } else {
        return info;
      }
    };
  }

  /**
   * Returns the health check map using the configured health
   * indicators
   */
  public getHealthChecksMap(): HealthCheckMap {
    return this.options.endpoints.reduce(
      (healthChecks, endpoint) => {
        healthChecks[endpoint.url] = this.getHealthCheckExecutor(endpoint);
        return healthChecks;
      },
      {} as HealthCheckMap,
    );
  }

  /**
   * Bootstraps the third party terminus library with
   * the given module options
   */
  private bootstrapTerminus() {
    const healthChecks = this.getHealthChecksMap();
    this.terminus(this.httpServer, {
      healthChecks,
      // Use the logger of the user
      // or by the default logger if is not defined
      logger: this.options.logger || this.logError.bind(this),
    });
    this.logHealthCheckRegister(healthChecks);
  }

  /**
   * Gets called when the application gets bootstrapped.
   */
  public onApplicationBootstrap() {
    // httpServer for express, instance.server for fastify
    this.httpServer = this.refHost.applicationRef.getHttpServer();
    this.bootstrapTerminus();
  }
}

import {
  Injectable,
  Inject,
  OnApplicationBootstrap,
  HttpServer,
  Logger,
} from '@nestjs/common';
import { TERMINUS_MODULE_OPTIONS, TERMINUS_LIB } from './terminus.constants';
import { TerminusModuleOptions, HealthIndicatorFunction } from './interfaces';
import { HTTP_SERVER_REF, ModuleRef } from '@nestjs/core';
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
   * The http adapter of NestJS
   */
  private httpAdapter: HttpServer;
  /**
   * Intiailizes the service
   * @param options The terminus module options
   * @param terminus The terminus instance
   * @param moduleRef The module refeference
   */
  constructor(
    @Inject(TERMINUS_MODULE_OPTIONS)
    private readonly options: TerminusModuleOptions,
    @Inject(TERMINUS_LIB) private readonly terminus: Terminus,
    private readonly moduleRef: ModuleRef,
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
   * Prepares the health check using the configured health
   * indicators
   */
  private prepareHealthChecks(): HealthCheckMap {
    const healthChecks: HealthCheckMap = {};
    this.options.endpoints.forEach(endpoint => {
      const healthCheck = async () => {
        const { results, errors } = await this.executeHealthIndicators(
          endpoint.healthIndicators,
        );
        const info = (results || [])
          .concat(errors)
          .reduce((previous, current) => Object.assign(previous, current), {});

        if (errors.length) {
          throw new HealthCheckError('Healthcheck failed', info);
        } else {
          return info;
        }
      };

      healthChecks[endpoint.url] = healthCheck;
    });

    return healthChecks;
  }

  /**
   * Logs an error message of terminuss
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
   * @param healtChecks The health check map to log
   */
  private logHealthCheckRegister(healtChecks: HealthCheckMap) {
    Object.keys(healtChecks).forEach(endpoint =>
      this.logger.log(
        `Mapped {${endpoint}, GET} healthcheck route`,
        'TerminusExplorer',
      ),
    );
  }

  /**
   * Bootstraps the third party terminus library with
   * the given module options
   */
  private bootstrapTerminus() {
    const healthChecks = this.prepareHealthChecks();
    this.terminus(this.httpServer, {
      healthChecks,
      logger: this.logError.bind(this),
    });
    this.logHealthCheckRegister(healthChecks);
  }

  /**
   * Gets called when the application gets bootstrapped.
   */
  public onApplicationBootstrap() {
    // Get the http adapter of nestjs
    this.httpAdapter = this.moduleRef.get<HttpServer>(HTTP_SERVER_REF);
    this.httpServer = this.httpAdapter.getHttpServer();
    this.bootstrapTerminus();
  }
}

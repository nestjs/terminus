import {
  Injectable,
  Inject,
  OnApplicationBootstrap,
  HttpServer,
  Logger,
} from '@nestjs/common';
import { TERMINUS_MODULE_OPTIONS, TERMINUS_LIB } from './terminus.constants';
import { TerminusModuleOptions, HealthIndicatorFunction } from './interfaces';
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
   * Logs an error message of terminus
   * @param message The log message
   * @param error The error which was thrown
   */
  private logError(message: string, error: HealthCheckError | Error): void {
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

  /**
   * Checks which logger it should use and returns it
   *
   * @returns Returns the logger which should be used for the terminus
   * library
   */
  private getTerminusLogger(): (...args: any[]) => void {
    // Function which acts as a empty placeholder
    // so the program does not break
    const noop = (...args: any[]): void => null;

    let terminusLogger = this.options.logger;

    // If null (not undefined) is given, return the empty function placeholder
    if (terminusLogger === null) {
      terminusLogger = noop;
    } else if (!terminusLogger) {
      // If the userLogger is not defined or any false-value
      // use the default logger
      terminusLogger = this.logError.bind(this);
    }

    // If the user logger is truth-y then return it
    return terminusLogger;
  }

  /**
   * Bootstraps the third party terminus library with
   * the given module options
   */
  private bootstrapTerminus() {
    const healthChecks = this.prepareHealthChecks();
    const logger = this.getTerminusLogger();

    this.terminus(this.httpServer, { healthChecks, logger });
    this.logHealthCheckRegister(healthChecks);
  }

  /**
   * Gets called when the application gets bootstrapped.
   */
  public onApplicationBootstrap() {
    this.httpServer = this.refHost.applicationRef.httpServer;
    this.bootstrapTerminus();
  }
}

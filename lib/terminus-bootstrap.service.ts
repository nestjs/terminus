import {
  Injectable,
  Inject,
  OnApplicationBootstrap,
  HttpServer,
} from '@nestjs/common';
import { TERMINUS_MODULE_OPTIONS, TERMINUS_LIB } from './terminus.constants';
import { TerminusModuleOptions, HealthIndicator } from './interfaces';
import { HTTP_SERVER_REF } from '@nestjs/core';
import { Server } from 'http';
import { HealthCheckError, Terminus } from '@godaddy/terminus';

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
   * Intiailizes the service
   * @param options The terminus module options
   * @param httpAdapter The http adapter from NestJS which will be used for the terminus instance
   * @param terminus The terminus instance
   */
  constructor(
    @Inject(TERMINUS_MODULE_OPTIONS)
    private readonly options: TerminusModuleOptions,
    @Inject(HTTP_SERVER_REF) private readonly httpAdapter: HttpServer,
    @Inject(TERMINUS_LIB) private readonly terminus: Terminus,
  ) {}

  /**
   * Executes the given health indicators and stores the caused
   * errors and results
   * @param healthIndicators The health indicators which should get executed
   */
  private async executeHealthIndicators(
    healthIndicators,
  ): Promise<{ results: any[]; errors: any[] }> {
    const results: any[] = [];
    const errors: any[] = [];
    await Promise.all<HealthIndicator>(
      healthIndicators
        // Register all promises
        .map(healthIndicator => healthIndicator())
        .map(p => p.catch(error => error && errors.push(error.causes)))
        .map(p => p.then(result => result && results.push(result))),
    );

    return { results, errors };
  }

  /**
   * Prepares the health check using the configured health
   * indicators
   */
  private prepareHealthChecks() {
    const healthChecks = {};
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
   * Bootstraps the third party terminus library with
   * the given module options
   */
  private bootstrapTerminus() {
    const healthChecks = this.prepareHealthChecks();
    this.terminus(this.httpServer, {
      healthChecks,
    });
  }

  /**
   * Gets called when the application gets bootstrapped.
   */
  public onApplicationBootstrap() {
    this.httpServer = this.httpAdapter.getHttpServer();
    this.bootstrapTerminus();
  }
}

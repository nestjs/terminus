import {
  Injectable,
  Inject,
  OnApplicationBootstrap,
  Logger,
} from '@nestjs/common';
import { TERMINUS_MODULE_OPTIONS, TERMINUS_LIB } from './terminus.constants';
import { HttpAdapterHost, ApplicationConfig } from '@nestjs/core';
import { Server } from 'http';
import { validatePath } from '@nestjs/common/utils/shared.utils';
import { HealthCheckExecutor } from './health-check/health-check-executor.service';
import {
  TerminusModuleOptions,
  TerminusEndpoint,
} from './terminus-module-options.interface';
import { HealthCheckError } from './health-check';

export const SIG_NOT_EXIST = 'SIG_NOT_EXIST';

/**
 * Bootstraps the third party Terminus library with the
 * configured Module options
 */
@Injectable()
export class TerminusBootstrapService implements OnApplicationBootstrap {
  /**
   * The http server of NestJS
   */
  private httpServer!: Server;
  /**
   * The NestJS logger
   */
  private readonly logger = new Logger(TerminusBootstrapService.name, true);

  constructor(
    @Inject(TERMINUS_MODULE_OPTIONS)
    private readonly options: TerminusModuleOptions,
    @Inject(TERMINUS_LIB)
    private readonly terminus: any,
    private readonly healthCheckExecutor: HealthCheckExecutor,
    private readonly refHost: HttpAdapterHost<any>,
    private readonly applicationConfig: ApplicationConfig,
  ) {}

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
  private logHealthCheckRegister(healthChecks: any) {
    Object.keys(healthChecks).forEach((endpoint) =>
      this.logger.log(
        `Mapped {${endpoint}, GET} healthcheck route`,
        'TerminusExplorer',
      ),
    );
  }

  private validateEndpointUrl(endpoint: TerminusEndpoint): string {
    const prefix = this.applicationConfig.getGlobalPrefix();

    const shouldUseGlobalPrefix =
      prefix &&
      (endpoint.useGlobalPrefix
        ? endpoint.useGlobalPrefix
        : this.options.useGlobalPrefix &&
          endpoint.useGlobalPrefix === undefined);

    let url = validatePath(endpoint.url);

    if (shouldUseGlobalPrefix) {
      url = validatePath(prefix) + url;
    }

    return url;
  }

  /**
   * Returns the health check map using the configured health
   * indicators
   */
  public getHealthChecksMap(): any {
    return this.options.endpoints.reduce((healthChecks, endpoint) => {
      const url = this.validateEndpointUrl(endpoint);
      healthChecks[url] = async () =>
        this.healthCheckExecutor.executeDeprecated(endpoint.healthIndicators);
      return healthChecks;
    }, {} as any);
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
      // Without that terminus will use default SIGTERM signal and default handler which stops this.httpServer
      signal: SIG_NOT_EXIST,
    });
    this.logHealthCheckRegister(healthChecks);
  }

  private hasHttpServer(): boolean {
    return this.refHost && this.refHost.httpAdapter && this.refHost.httpAdapter;
  }

  /**
   * Gets called when the application gets bootstrapped.
   */
  public onApplicationBootstrap() {
    // In case the application context has been bootstrapped with
    // NestFactory.createApplicationContext(), ignore bootstrapping
    // Terminus
    if (this.hasHttpServer()) {
      this.httpServer = this.refHost.httpAdapter.getHttpServer();
      this.bootstrapTerminus();
    }
  }
}

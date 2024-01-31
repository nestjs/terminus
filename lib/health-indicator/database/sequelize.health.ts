import { Injectable, Scope } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type * as NestJSSequelize from '@nestjs/sequelize';
import {
  type HealthIndicatorResult,
  TimeoutError,
  ConnectionNotFoundError,
} from '../..';
import { HealthCheckError } from '../../health-check/health-check.error';
import {
  promiseTimeout,
  TimeoutError as PromiseTimeoutError,
  checkPackages,
} from '../../utils';
import { HealthIndicator } from '../health-indicator';

export interface SequelizePingCheckSettings {
  /**
   * The connection which the ping check should get executed
   */
  connection?: any;
  /**
   * The amount of time the check should require in ms
   */
  timeout?: number;
}

/**
 * The SequelizeHealthIndicator contains health indicators
 * which are used for health checks related to Sequelize
 *
 * @publicApi
 * @module TerminusModule
 */
@Injectable({ scope: Scope.TRANSIENT })
export class SequelizeHealthIndicator extends HealthIndicator {
  /**
   * Initializes the SequelizeHealthIndicator
   *
   * @param {ModuleRef} moduleRef The NestJS module reference
   */
  constructor(private moduleRef: ModuleRef) {
    super();
    this.checkDependantPackages();
  }

  /**
   * Checks if the dependant packages are present
   */
  private checkDependantPackages() {
    checkPackages(['@nestjs/sequelize', 'sequelize'], this.constructor.name);
  }

  /**
   * Returns the connection of the current DI context
   */
  private getContextConnection(): any | null {
    const { getConnectionToken } =
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@nestjs/sequelize/dist/common/sequelize.utils') as typeof NestJSSequelize;

    try {
      return this.moduleRef.get(getConnectionToken() as string, {
        strict: false,
      });
    } catch (err) {
      return null;
    }
  }

  /**
   * Pings a sequelize connection
   * @param connection The connection which the ping should get executed
   * @param timeout The timeout how long the ping should maximum take
   *
   */
  private async pingDb(connection: any, timeout: number) {
    const check: Promise<any> = connection.query('SELECT 1');
    return await promiseTimeout(timeout, check);
  }

  /**
   * Checks if the Sequelize responds in (default) 1000ms and
   * returns a result object corresponding to the result
   *
   * @param key The key which will be used for the result object
   * @param options The options for the ping
   * @example
   * sequelizeHealthIndicator.pingCheck('database', { timeout: 1500 });
   */
  public async pingCheck(
    key: string,
    options: SequelizePingCheckSettings = {},
  ): Promise<HealthIndicatorResult> {
    this.checkDependantPackages();

    const connection = options.connection || this.getContextConnection();
    const timeout = options.timeout || 1000;

    if (!connection) {
      throw new ConnectionNotFoundError(
        this.getStatus(key, false, {
          message: 'Connection provider not found in application context',
        }),
      );
    }

    try {
      await this.pingDb(connection, timeout);
    } catch (err) {
      if (err instanceof PromiseTimeoutError) {
        throw new TimeoutError(
          timeout,
          this.getStatus(key, false, {
            message: `timeout of ${timeout}ms exceeded`,
          }),
        );
      }

      throw new HealthCheckError(
        `${key} is not available`,
        this.getStatus(key, false),
      );
    }

    return this.getStatus(key, true);
  }
}

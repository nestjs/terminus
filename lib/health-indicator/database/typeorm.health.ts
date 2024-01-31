import { Injectable, Scope } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type * as NestJSTypeOrm from '@nestjs/typeorm';
import type * as TypeOrm from 'typeorm';
import { HealthIndicator, type HealthIndicatorResult } from '../';
import {
  TimeoutError,
  ConnectionNotFoundError,
  MongoConnectionError,
} from '../../errors';
import { HealthCheckError } from '../../health-check/health-check.error';
import {
  TimeoutError as PromiseTimeoutError,
  promiseTimeout,
  checkPackages,
} from '../../utils';

export interface TypeOrmPingCheckSettings {
  /**
   * The connection which the ping check should get executed
   */
  // `any` type in case of typeorm version mismatch
  connection?: any;
  /**
   * The amount of time the check should require in ms
   */
  timeout?: number;
}

/**
 * The TypeOrmHealthIndicator contains health indicators
 * which are used for health checks related to TypeOrm
 *
 * @publicApi
 * @module TerminusModule
 */
@Injectable({ scope: Scope.TRANSIENT })
export class TypeOrmHealthIndicator extends HealthIndicator {
  /**
   * Initializes the TypeOrmHealthIndicator
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
    checkPackages(['@nestjs/typeorm', 'typeorm'], this.constructor.name);
  }

  /**
   * Returns the connection of the current DI context
   */
  private getContextConnection(): TypeOrm.DataSource | null {
    const { getDataSourceToken } =
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@nestjs/typeorm/dist/common/typeorm.utils') as typeof NestJSTypeOrm;

    try {
      return this.moduleRef.get(getDataSourceToken() as string, {
        strict: false,
      });
    } catch (err) {
      return null;
    }
  }

  /**
   * Pings a typeorm connection
   *
   * @param connection The connection which the ping should get executed
   * @param timeout The timeout how long the ping should maximum take
   *
   */
  private async pingDb(connection: TypeOrm.DataSource, timeout: number) {
    let check: Promise<any>;
    switch (connection.options.type) {
      case 'mongodb':
        check = (connection.driver as any).queryRunner.databaseConnection
          .db()
          .command({ ping: 1 });
        break;
      case 'oracle':
        check = connection.query('SELECT 1 FROM DUAL');
        break;
      case 'sap':
        check = connection.query('SELECT now() FROM dummy');
        break;
      default:
        check = connection.query('SELECT 1');
        break;
    }
    return await promiseTimeout(timeout, check);
  }

  /**
   * Checks if responds in (default) 1000ms and
   * returns a result object corresponding to the result
   * @param key The key which will be used for the result object
   * @param options The options for the ping
   *
   * @example
   * typeOrmHealthIndicator.pingCheck('database', { timeout: 1500 });
   */
  async pingCheck(
    key: string,
    options: TypeOrmPingCheckSettings = {},
  ): Promise<HealthIndicatorResult> {
    this.checkDependantPackages();

    const connection: TypeOrm.DataSource | null =
      options.connection || this.getContextConnection();
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
      if (err instanceof MongoConnectionError) {
        throw new HealthCheckError(
          err.message,
          this.getStatus(key, false, {
            message: err.message,
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

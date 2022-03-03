import { Injectable, Scope } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { HealthCheckError } from '../../health-check/health-check.error';

import * as TypeOrm from 'typeorm';
import * as NestJSTypeOrm from '@nestjs/typeorm';

import {
  TimeoutError,
  ConnectionNotFoundError,
  MongoConnectionError,
} from '../../errors';
import {
  TimeoutError as PromiseTimeoutError,
  promiseTimeout,
  checkPackages,
} from '../../utils';
import { HealthIndicator, HealthIndicatorResult } from '../';

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
  private getContextConnection(): TypeOrm.Connection | null {
    const { getConnectionToken } =
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@nestjs/typeorm/dist/common/typeorm.utils') as typeof NestJSTypeOrm;

    try {
      return this.moduleRef.get(getConnectionToken() as string, {
        strict: false,
      });
    } catch (err) {
      return null;
    }
  }

  private async checkMongoDBConnection(connection: any) {
    return new Promise<void>((resolve, reject) => {
      const driver = connection.driver as any;
      // Hacky workaround which uses the native MongoClient
      driver.mongodb.MongoClient.connect(
        connection.options.url ? connection.options.url : driver.buildConnectionUrl(connection.options),
        driver.buildConnectionOptions(connection.options),
        (err: Error, client: any) => {
          if (err) return reject(new MongoConnectionError(err.message));
          client.close(() => resolve());
        },
      );
    });
  }

  /**
   * Pings a typeorm connection
   *
   * @param connection The connection which the ping should get executed
   * @param timeout The timeout how long the ping should maximum take
   *
   */
  private async pingDb(connection: TypeOrm.Connection, timeout: number) {
    let check: Promise<any>;
    switch (connection.options.type) {
      case 'mongodb':
        check = this.checkMongoDBConnection(connection);
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
    let isHealthy = false;
    this.checkDependantPackages();

    const connection: TypeOrm.Connection | null =
      options.connection || this.getContextConnection();
    const timeout = options.timeout || 1000;

    if (!connection) {
      throw new ConnectionNotFoundError(
        this.getStatus(key, isHealthy, {
          message: 'Connection provider not found in application context',
        }),
      );
    }

    try {
      await this.pingDb(connection, timeout);
      isHealthy = true;
    } catch (err) {
      if (err instanceof PromiseTimeoutError) {
        throw new TimeoutError(
          timeout,
          this.getStatus(key, isHealthy, {
            message: `timeout of ${timeout}ms exceeded`,
          }),
        );
      }
      if (err instanceof MongoConnectionError) {
        throw new HealthCheckError(
          err.message,
          this.getStatus(key, isHealthy, {
            message: err.message,
          }),
        );
      }
    }

    if (isHealthy) {
      return this.getStatus(key, isHealthy);
    } else {
      throw new HealthCheckError(
        `${key} is not available`,
        this.getStatus(key, isHealthy),
      );
    }
  }
}

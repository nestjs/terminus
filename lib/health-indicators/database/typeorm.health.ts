import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { ModuleRef } from '@nestjs/core';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { HealthCheckError } from '@godaddy/terminus';

import * as NestJSTypeOrm from '@nestjs/typeorm';

import { HealthIndicatorResult } from '../../interfaces/health-indicator.interface';
import { TimeoutError } from '../../errors';
import {
  TimeoutError as PromiseTimeoutError,
  promiseTimeout,
} from '../../utils';
import { HealthIndicator } from '../health-indicator';

export interface TypeOrmPingCheckSettings {
  /**
   * The connection which the ping check should get executed
   */
  connection?: Connection;
  /**
   * The amount of time the check should require in ms
   * @default 1000
   */
  timeout?: number;
}

/**
 * The TypeOrmHealthIndicator contains health indicators
 * which are used for health checks related to TypeOrm
 */
@Injectable()
export class TypeOrmHealthIndicator extends HealthIndicator {
  /**
   * Initializes the TypeOrmHealthIndicator
   *
   * @param {ModuleRef} moduleRef The NestJS module reference
   *
   * @public
   */
  constructor(private moduleRef: ModuleRef) {
    super();
  }

  /**
   * Checks if the dependant packages are present
   */
  private checkDependantPackages() {
    loadPackage('@nestjs/typeorm', this.constructor.name);
    loadPackage('typeorm', this.constructor.name);
  }

  /**
   * Returns the connection of the current DI context
   */
  private getContextConnection(): Connection {
    const {
      getConnectionToken,
    } = require('@nestjs/typeorm/dist/common/typeorm.utils') as typeof NestJSTypeOrm;

    return this.moduleRef.get(getConnectionToken() as string);
  }

  /**
   * Pings a typeorm connection
   *
   * @param connection The connection which the ping should get executed
   * @param timeout The timeout how long the ping should maximum take
   *
   */
  async pingDb(connection?: Connection, timeout?: number) {
    return await promiseTimeout(timeout, connection.query('SELECT 1'));
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

    const connection: Connection =
      options.connection || this.getContextConnection();
    const timeout = options.timeout || 1000;

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

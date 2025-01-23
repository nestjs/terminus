import { Injectable, Scope } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type * as NestJSMongoose from '@nestjs/mongoose';
import { type HealthIndicatorResult } from '../..';
import {
  promiseTimeout,
  TimeoutError as PromiseTimeoutError,
  checkPackages,
} from '../../utils';
import { HealthIndicatorService } from '../health-indicator.service';

export interface MongoosePingCheckSettings {
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
 * The MongooseHealthIndicator contains health indicators
 * which are used for health checks related to Mongoose
 *
 * @publicApi
 * @module TerminusModule
 */
@Injectable({ scope: Scope.TRANSIENT })
export class MongooseHealthIndicator {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {
    this.checkDependantPackages();
  }

  /**
   * Checks if the dependant packages are present
   */
  private checkDependantPackages() {
    checkPackages(['@nestjs/mongoose', 'mongoose'], this.constructor.name);
  }

  /**
   * Returns the connection of the current DI context
   */
  private getContextConnection(): any | null {
    const { getConnectionToken } =
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@nestjs/mongoose') as typeof NestJSMongoose;

    try {
      return this.moduleRef.get(
        getConnectionToken('DatabaseConnection') as string,
        {
          strict: false,
        },
      );
    } catch (err) {
      return null;
    }
  }

  /**
   * Pings a mongoose connection
   * @param connection The connection which the ping should get executed
   * @param timeout The timeout how long the ping should maximum take
   *
   */
  private async pingDb(connection: any, timeout: number) {
    const promise =
      connection.readyState === 1 ? Promise.resolve() : Promise.reject();
    return await promiseTimeout(timeout, promise);
  }

  /**
   * Checks if the MongoDB responds in (default) 1000ms and
   * returns a result object corresponding to the result
   *
   * @param key The key which will be used for the result object
   * @param options The options for the ping
   * @example
   * mongooseHealthIndicator.pingCheck('mongodb', { timeout: 1500 });
   */
  public async pingCheck<Key extends string = string>(
    key: Key,
    options: MongoosePingCheckSettings = {},
  ): Promise<HealthIndicatorResult<Key>> {
    this.checkDependantPackages();
    const check = this.healthIndicatorService.check(key);

    const connection = options.connection || this.getContextConnection();
    const timeout = options.timeout || 1000;

    if (!connection) {
      return check.down('Connection provider not found in application context');
    }

    try {
      await this.pingDb(connection, timeout);
    } catch (err) {
      if (err instanceof PromiseTimeoutError) {
        return check.down(`timeout of ${timeout}ms exceeded`);
      }

      return check.down();
    }

    return check.up();
  }
}

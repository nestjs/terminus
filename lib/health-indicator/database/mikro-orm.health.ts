import type * as MikroOrm from '@mikro-orm/core';
import { Injectable, Scope } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { HealthIndicator, type HealthIndicatorResult } from '..';
import { TimeoutError } from '../../errors';
import { DatabaseNotConnectedError } from '../../errors/database-not-connected.error';
import { HealthCheckError } from '../../health-check/health-check.error';
import {
  TimeoutError as PromiseTimeoutError,
  promiseTimeout,
  checkPackages,
} from '../../utils';

export interface MikroOrmPingCheckSettings {
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
 * The MikroOrmHealthIndicator contains health indicators
 * which are used for health checks related to MikroOrm
 *
 * @publicApi
 * @module TerminusModule
 */
@Injectable({ scope: Scope.TRANSIENT })
export class MikroOrmHealthIndicator extends HealthIndicator {
  /**
   * Initializes the MikroOrmHealthIndicator
   *
   * @param {ModuleRef} moduleRef The NestJS module reference
   */
  constructor(private moduleRef: ModuleRef) {
    super();
    this.checkDependantPackages();
  }

  /**
   * Checks if responds in (default) 1000ms and
   * returns a result object corresponding to the result
   * @param key The key which will be used for the result object
   * @param options The options for the ping
   *
   * @example
   * MikroOrmHealthIndicator.pingCheck('database', { timeout: 1500 });
   */
  public async pingCheck(
    key: string,
    options: MikroOrmPingCheckSettings = {},
  ): Promise<HealthIndicatorResult> {
    this.checkDependantPackages();

    const connection = options.connection || this.getContextConnection();
    const timeout = options.timeout || 1000;

    if (!connection) {
      return this.getStatus(key, false);
    }

    try {
      await this.pingDb(connection, timeout);
    } catch (error) {
      // Check if the error is a timeout error
      if (error instanceof PromiseTimeoutError) {
        throw new TimeoutError(
          timeout,
          this.getStatus(key, false, {
            message: `timeout of ${timeout}ms exceeded`,
          }),
        );
      }
      if (error instanceof DatabaseNotConnectedError) {
        throw new HealthCheckError(
          error.message,
          this.getStatus(key, false, {
            message: error.message,
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

  private checkDependantPackages() {
    checkPackages(
      ['@mikro-orm/nestjs', '@mikro-orm/core'],
      this.constructor.name,
    );
  }

  /**
   * Returns the connection of the current DI context
   */
  private getContextConnection(): MikroOrm.Connection | null {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MikroORM } = require('@mikro-orm/core') as typeof MikroOrm;
    const mikro = this.moduleRef.get(MikroORM, { strict: false });

    const connection: MikroOrm.Connection = mikro.em.getConnection();

    if (!connection) {
      return null;
    }
    return connection;
  }

  /**
   * Pings a mikro-orm connection
   *
   * @param connection The connection which the ping should get executed
   * @param timeout The timeout how long the ping should maximum take
   *
   */
  private async pingDb(connection: MikroOrm.Connection, timeout: number) {
    const checker = async () => {
      const isConnected = await connection.isConnected();
      if (!isConnected) {
        throw new DatabaseNotConnectedError();
      }
    };

    return await promiseTimeout(timeout, checker());
  }
}

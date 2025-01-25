import type * as MikroOrm from '@mikro-orm/core';
import { Injectable, Scope } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { type HealthIndicatorResult } from '..';
import { DatabaseNotConnectedError } from '../../errors/database-not-connected.error';
import {
  TimeoutError as PromiseTimeoutError,
  promiseTimeout,
  checkPackages,
} from '../../utils';
import { HealthIndicatorService } from '../health-indicator.service';

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
export class MikroOrmHealthIndicator {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {
    this.checkDependantPackages();
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

  /**
   * Checks if responds in (default) 1000ms and
   * returns a result object corresponding to the result
   * @param key The key which will be used for the result object
   * @param options The options for the ping
   *
   * @example
   * MikroOrmHealthIndicator.pingCheck('database', { timeout: 1500 });
   */
  public async pingCheck<Key extends string = string>(
    key: Key,
    options: MikroOrmPingCheckSettings = {},
  ): Promise<HealthIndicatorResult<Key>> {
    this.checkDependantPackages();
    const check = this.healthIndicatorService.check(key);

    const timeout = options.timeout || 1000;
    const connection = options.connection || this.getContextConnection();

    if (!connection) {
      return check.down();
    }

    try {
      await this.pingDb(connection, timeout);
    } catch (error) {
      // Check if the error is a timeout error
      if (error instanceof PromiseTimeoutError) {
        return check.down(`timeout of ${timeout}ms exceeded`);
      }
      if (error instanceof DatabaseNotConnectedError) {
        return check.down(error.message);
      }

      return check.down();
    }

    return check.up();
  }
}

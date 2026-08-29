import { Injectable, Scope } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { DatabaseNotConnectedError } from '../../errors/database-not-connected.error.js';
import {
  TimeoutError as PromiseTimeoutError,
  promiseTimeout,
  checkPackages,
  optionalRequire,
} from '../../utils/index.js';
import { type HealthIndicatorResult } from '../health-indicator-result.interface.js';
import { HealthIndicatorService } from '../health-indicator.service.js';

/**
 * Duck type shared by MikroORM v6 `Connection` and v7 `MikroORM`.
 * Optional peers are not imported as values so both majors keep working.
 */
interface MikroOrmPingTarget {
  isConnected(): boolean | Promise<boolean>;
  /**
   * MikroORM 7 connects lazily (`init()` no longer opens a socket).
   * Present on `MikroORM` and on driver `Connection` objects.
   */
  connect?: () => unknown | Promise<unknown>;
}

export interface MikroOrmPingCheckSettings {
  /**
   * The connection which the ping check should get executed.
   * Accepts a MikroORM `Connection` (v6), the `MikroORM` instance (v7),
   * or any object exposing `isConnected()`.
   */
  connection?: MikroOrmPingTarget;
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
   * Returns a ping target from the current DI context.
   * MikroORM v6 exposes `isConnected()` on the driver connection;
   * v7 also exposes it on the `MikroORM` instance itself.
   */
  private getContextConnection(): MikroOrmPingTarget | null {
    const mikroOrm = optionalRequire('@mikro-orm/core') as {
      MikroORM?: new (...args: any[]) => MikroOrmPingTarget & {
        em?: { getConnection?: () => MikroOrmPingTarget };
      };
    } | null;

    if (!mikroOrm?.MikroORM) {
      return null;
    }

    try {
      const mikro = this.moduleRef.get(mikroOrm.MikroORM, {
        strict: false,
      }) as MikroOrmPingTarget & {
        em?: { getConnection?: () => MikroOrmPingTarget };
      };

      if (typeof mikro?.isConnected === 'function') {
        return mikro;
      }

      const connection = mikro?.em?.getConnection?.();
      if (typeof connection?.isConnected === 'function') {
        return connection;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Pings a mikro-orm connection
   *
   * @param connection The connection which the ping should get executed
   * @param timeout The timeout how long the ping should maximum take
   *
   */
  private async pingDb(connection: MikroOrmPingTarget, timeout: number) {
    const checker = async () => {
      let isConnected = await connection.isConnected();

      // v7: MikroORM.init() / Nest forRoot() no longer open the driver
      // connection. Open it once when the first probe sees a cold ORM.
      if (!isConnected && typeof connection.connect === 'function') {
        try {
          await connection.connect();
        } catch {
          throw new DatabaseNotConnectedError();
        }
        isConnected = await connection.isConnected();
      }

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

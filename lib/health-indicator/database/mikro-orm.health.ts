import type * as MikroOrm from '@mikro-orm/core';
import { Injectable, Scope } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { DatabaseNotConnectedError } from '../../errors/database-not-connected.error.js';
import { assertPackages, loadPackage } from '../../utils/index.js';
import {
  type HealthCheckAttempt,
  HealthIndicatorService,
} from '../health-indicator.service.js';

export interface MikroOrmPingCheckSettings {
  /**
   * The connection which the ping check should get executed
   */
  connection?: any;
  /**
   * The amount of time the check should require in ms
   * @deprecated Chain `.withTimeout(ms)` on the returned attempt instead,
   * e.g. `indicator.pingCheck('database').withTimeout(1500)`
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
    assertPackages(
      ['@mikro-orm/nestjs', '@mikro-orm/core'],
      this.constructor.name,
    );
  }

  /**
   * Returns the connection of the current DI context
   */
  private async getContextConnection(): Promise<MikroOrm.Connection | null> {
    const { MikroORM } = await loadPackage('@mikro-orm/core');
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
   *
   */
  private async pingDb(connection: MikroOrm.Connection) {
    if (!(await connection.isConnected())) {
      throw new DatabaseNotConnectedError();
    }
  }

  /**
   * Checks if responds in (default) 1000ms and
   * returns a result object corresponding to the result
   * @param key The key which will be used for the result object
   * @param options The options for the ping
   *
   * @example
   * MikroOrmHealthIndicator.pingCheck('database').withTimeout(1500);
   */
  public pingCheck<Key extends string = string>(
    key: Key,
    options: MikroOrmPingCheckSettings = {},
  ): HealthCheckAttempt<Key> {
    return this.healthIndicatorService
      .check(key)
      .attempt(async () => {
        const connection =
          options.connection || (await this.getContextConnection());

        if (!connection) {
          throw new Error(
            'Connection provider not found in application context',
          );
        }

        await this.pingDb(connection);
      })
      .withTimeout(options.timeout ?? 1000);
  }
}

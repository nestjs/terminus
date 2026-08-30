import { Injectable, Scope } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { type HealthIndicatorResult } from '../../index.js';
import { assertPackages, loadPackage } from '../../utils/index.js';
import { HealthIndicatorService } from '../health-indicator.service.js';

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
export class SequelizeHealthIndicator {
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
    assertPackages(['@nestjs/sequelize', 'sequelize'], this.constructor.name);
  }

  /**
   * Returns the connection of the current DI context
   */
  private async getContextConnection(): Promise<any | null> {
    const { getConnectionToken } = await loadPackage('@nestjs/sequelize');

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
   *
   */
  private async pingDb(connection: any) {
    await connection.query('SELECT 1');
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
  public async pingCheck<Key extends string = string>(
    key: Key,
    options: SequelizePingCheckSettings = {},
  ): Promise<HealthIndicatorResult<Key>> {
    const check = this.healthIndicatorService.check(key);

    const connection =
      options.connection || (await this.getContextConnection());
    const timeout = options.timeout || 1000;

    if (!connection) {
      return check.down('Connection provider not found in application context');
    }

    return check
      .attempt(() => this.pingDb(connection))
      .withTimeout(timeout)
      .execute();
  }
}

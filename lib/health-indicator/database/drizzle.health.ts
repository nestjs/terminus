import { Injectable, Scope } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { assertPackages, loadPackage } from '../../utils/index.js';
import {
  type HealthCheckAttempt,
  HealthIndicatorService,
} from '../health-indicator.service.js';

export interface DrizzlePingCheckSettings {
  /**
   * The connection which the ping check should get executed
   */
  connection?: any;
  /**
   * The connection name to retrieve from the moduleRef if connection is not provided
   */
  connectionName?: string;
  /**
   * The amount of time the check should require in ms
   * @deprecated Chain `.withTimeout(ms)` on the returned attempt instead,
   * e.g. `indicator.pingCheck('database').withTimeout(1500)`
   */
  timeout?: number;
}

/**
 * The DrizzleHealthIndicator contains health indicators
 * which are used for health checks related to Drizzle ORM
 *
 * @publicApi
 * @module TerminusModule
 */
@Injectable({ scope: Scope.TRANSIENT })
export class DrizzleHealthIndicator {
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
    assertPackages(['@nestjs/drizzle', 'drizzle-orm'], this.constructor.name);
  }

  /**
   * Returns the connection of the current DI context
   */
  private async getContextConnection(name?: string): Promise<any | null> {
    const { getDrizzleToken } = await loadPackage('@nestjs/drizzle');

    try {
      return this.moduleRef.get(getDrizzleToken(name) as string, {
        strict: false,
      });
    } catch (err) {
      return null;
    }
  }

  /**
   * Pings a drizzle connection
   * @param connection The connection which the ping should get executed
   */
  private async pingDb(connection: any) {
    const { sql } = await loadPackage('drizzle-orm');
    await connection.execute(sql`SELECT 1`);
  }

  /**
   * Checks if Drizzle responds in (default) 1000ms and
   * returns a result object corresponding to the result
   *
   * @param key The key which will be used for the result object
   * @param options The options for the ping
   * @example
   * drizzleHealthIndicator.pingCheck('database').withTimeout(1500);
   */
  public pingCheck<Key extends string = string>(
    key: Key,
    options: DrizzlePingCheckSettings = {},
  ): HealthCheckAttempt<Key> {
    return this.healthIndicatorService
      .check(key)
      .attempt(async () => {
        const connection =
          options.connection ||
          (await this.getContextConnection(options.connectionName));

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

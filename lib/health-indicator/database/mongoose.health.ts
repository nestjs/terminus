import { Injectable, Scope } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { DatabaseNotConnectedError } from '../../errors/database-not-connected.error.js';
import { assertPackages, loadPackage } from '../../utils/index.js';
import {
  type HealthCheckAttempt,
  HealthIndicatorService,
} from '../health-indicator.service.js';

export interface MongoosePingCheckSettings {
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
    assertPackages(['@nestjs/mongoose', 'mongoose'], this.constructor.name);
  }

  /**
   * Returns the connection of the current DI context
   */
  private async getContextConnection(): Promise<any | null> {
    const { getConnectionToken } = await loadPackage('@nestjs/mongoose');

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
   *
   */
  private async pingDb(connection: any) {
    if (connection.readyState !== 1) {
      throw new DatabaseNotConnectedError();
    }
    await connection.db.command({ ping: 1 });
  }

  /**
   * Checks if the MongoDB responds in (default) 1000ms and
   * returns a result object corresponding to the result
   *
   * @param key The key which will be used for the result object
   * @param options The options for the ping
   * @example
   * mongooseHealthIndicator.pingCheck('mongodb').withTimeout(1500);
   */
  public pingCheck<Key extends string = string>(
    key: Key,
    options: MongoosePingCheckSettings = {},
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

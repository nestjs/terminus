import { Injectable, Scope } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type * as TypeOrm from 'typeorm';
import { assertPackages, loadPackage } from '../../utils/index.js';
import {
  type HealthCheckAttempt,
  HealthIndicatorService,
} from '../health-indicator.service.js';

export interface TypeOrmPingCheckSettings {
  /**
   * The connection which the ping check should get executed
   */
  // `any` type in case of typeorm version mismatch
  connection?: any;
  /**
   * The amount of time the check should require in ms
   * @deprecated Chain `.withTimeout(ms)` on the returned attempt instead,
   * e.g. `indicator.pingCheck('database').withTimeout(1500)`
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
export class TypeOrmHealthIndicator {
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
    assertPackages(['@nestjs/typeorm', 'typeorm'], this.constructor.name);
  }

  /**
   * Returns the connection of the current DI context
   */
  private async getContextConnection(): Promise<TypeOrm.DataSource | null> {
    const { getDataSourceToken } = await loadPackage('@nestjs/typeorm');

    try {
      return this.moduleRef.get(getDataSourceToken() as string, {
        strict: false,
      });
    } catch (err) {
      return null;
    }
  }

  /**
   * Pings a typeorm connection
   *
   * @param connection The connection which the ping should get executed
   *
   */
  private async pingDb(connection: TypeOrm.DataSource) {
    let check: Promise<any>;
    switch (connection.options.type) {
      case 'mongodb':
        check = (connection.driver as any).queryRunner.databaseConnection
          .db()
          .command({ ping: 1 });
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
    await check;
  }

  /**
   * Checks if responds in (default) 1000ms and
   * returns a result object corresponding to the result
   * @param key The key which will be used for the result object
   * @param options The options for the ping
   *
   * @example
   * typeOrmHealthIndicator.pingCheck('database').withTimeout(1500);
   */
  pingCheck<Key extends string>(
    key: Key,
    options: TypeOrmPingCheckSettings = {},
  ): HealthCheckAttempt<Key> {
    return this.healthIndicatorService
      .check(key)
      .attempt(async () => {
        const connection: TypeOrm.DataSource | null =
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

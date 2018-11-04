import { Injectable, Optional } from '@nestjs/common';
import { HealthIndicatorResult } from '../..';
import { Connection } from 'typeorm';
import { HealthCheckError } from '@godaddy/terminus';
import { ConnectionNotFoundError } from './connection-not-found.error';
import {
  promiseTimeout,
  TimeoutError as PromiseTimeoutError,
} from '../../utils';
import { TimeoutError } from './timeout-error';

/**
 * The settings for the database ping check
 */
export interface DatabasePingCheckSettings {
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
 * The DatabaseHealthIndicator contains health indicators
 * which are used for health checks related to database
 *
 */
@Injectable()
export class DatabaseHealthIndicator {
  /**
   * Initializes the database indicator
   * @param connection The database connection of the application context
   */
  constructor(@Optional() private readonly connection: Connection) {}

  /**
   * Generates the health indicator result object
   * @param key The key which will be used as key for the result object
   * @param isHealthy Whether the health indicator is healthy
   * @param options Additional options which will get appended to the result object
   */
  private getStatus(
    key: string,
    isHealthy: boolean,
    options?: { [key: string]: unknown },
  ): HealthIndicatorResult {
    return {
      [key]: {
        status: isHealthy ? 'up' : 'down',
        ...options,
      },
    };
  }

  /**
   * Pings a database
   * @param connection The connection which the ping should get executed
   * @param timeout The timeout how long the ping should maximum take
   *
   */
  private async pingDb(connection: Connection, timeout: number) {
    return await promiseTimeout(timeout, connection.query('SELECT 1'));
  }

  /**
   * Checks if the database responds in (default) 1000ms and
   * returns a result object corresponding to the result
   * @param key The key which will be used for the result object
   * @param options The optional options for the database ping check
   *
   * @example
   * ```TypeScript
   * databaseHealthIndicator.pingDb('db', { timeout: 800 });
   * ```
   */
  async pingCheck(
    key: string,
    options: DatabasePingCheckSettings = {},
  ): Promise<HealthIndicatorResult> {
    let isHealthy = false;
    const connection = options.connection || this.connection;
    const timeout = options.timeout || 1000;

    if (!connection) {
      throw new ConnectionNotFoundError(
        this.getStatus(key, isHealthy, {
          message: 'Connection provider not found in application context',
        }),
      );
    }

    try {
      await this.pingDb(connection, timeout);
      isHealthy = true;
    } catch (err) {
      if (err instanceof PromiseTimeoutError) {
        throw new TimeoutError(
          timeout,
          this.getStatus(key, isHealthy, {
            message: `Database did not respond after ${timeout}ms`,
          }),
        );
      }
    }

    if (isHealthy) {
      return this.getStatus(key, isHealthy);
    } else {
      throw new HealthCheckError(
        'Database is not available',
        this.getStatus(key, isHealthy),
      );
    }
  }
}

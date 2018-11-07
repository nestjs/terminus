import { Injectable, Optional } from '@nestjs/common';
import { HealthIndicatorResult } from '../..';
import { Connection } from 'typeorm';
import { HealthCheckError } from '@godaddy/terminus';
import {
  promiseTimeout,
  TimeoutError as PromiseTimeoutError,
} from '../../utils';
import { TimeoutError, ConnectionNotFoundError } from '../../errors';
import { HealthIndicator } from '../health-indicator';

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
 */
@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  /**
   * Initializes the database indicator
   * @param connection The database connection of the application context
   */
  constructor(@Optional() private readonly connection: Connection) {
    super();
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
   * databaseHealthIndicator.pingCheck('db', { timeout: 800 });
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
            message: `timeout of ${timeout}ms exceeded`,
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

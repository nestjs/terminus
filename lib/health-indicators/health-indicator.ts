import { HealthCheckError } from '@godaddy/terminus';
import { Connection as MongooseConnection } from 'mongoose';
import { Connection } from 'typeorm';
import {
  ConnectionNotFoundError,
  HealthIndicatorResult,
  TimeoutError,
} from '../';
import { TimeoutError as PromiseTimeoutError } from '../utils';
import { DatabasePingCheckSettings } from './databse-ping-check-settings.interface';

/**
 * Represents an abstract health indicator
 * with common functionalities
 */
export abstract class HealthIndicator<
  T extends Connection | MongooseConnection
> {
  /**
   * Generates the health indicator result object
   * @param key The key which will be used as key for the result object
   * @param isHealthy Whether the health indicator is healthy
   * @param options Additional options which will get appended to the result object
   * @param connection The Connection instance
   */

  protected constructor(protected connection: T) {}

  /**
   * Pings a database
   * @param connection The connection which the ping should get executed
   * @param timeout The timeout how long the ping should maximum take
   *
   */
  protected abstract async pingDb(connection: T, timeout: number): Promise<any>;

  protected getStatus(
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
   * Checks if the database responds in (default) 1000ms and
   * returns a result object corresponding to the result
   * @param key The key which will be used for the result object
   * @param options The optional options for the database ping check
   * @type T The underlying Connection from Mongoose or TypeOrm
   * @example
   * ```TypeScript
   * databaseHealthIndicator.pingCheck('db', { timeout: 800 });
   * ```
   */
  async pingCheck(
    key: string,
    options: DatabasePingCheckSettings<T> = {},
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
        `${key} is not available`,
        this.getStatus(key, isHealthy),
      );
    }
  }
}

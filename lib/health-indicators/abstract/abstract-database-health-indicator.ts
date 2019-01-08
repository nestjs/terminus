import { HealthCheckError } from '@godaddy/terminus';
import { Connection as MongooseConnection } from 'mongoose';
import { Connection } from 'typeorm';
import { ConnectionNotFoundError, TimeoutError } from '../../errors';
import { HealthIndicatorResult } from '../../interfaces';
import { TimeoutError as PromiseTimeoutError } from '../../utils';
import { DatabasePingCheckSettings } from '../databse-ping-check-settings.interface';
import { HealthIndicator } from './health-indicator';

/**
 * Abstract AbstractDatabaseHealthIndicator
 */
export abstract class AbstractDatabaseHealthIndicator extends HealthIndicator {
  /**
   * Constructor with the connection
   * @param connection The underlying Connection instance from TypeOrm or Mongoose connection
   */
  protected constructor(protected connection: Connection | MongooseConnection) {
    super();
  }

  /**
   * Pings a typeorm
   * @param connection The connection which the ping should get executed
   * @param timeout The timeout how long the ping should maximum take
   */
  protected abstract async pingDb(
    connection: Connection | MongooseConnection,
    timeout: number,
  ): Promise<any>;

  /**
   * Checks if the typeorm responds in (default) 1000ms and
   * returns a result object corresponding to the result
   * @param key
   * @param options
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
        `${key} is not available`,
        this.getStatus(key, isHealthy),
      );
    }
  }
}

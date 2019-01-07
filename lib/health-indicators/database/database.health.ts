import { Injectable, Optional } from '@nestjs/common';
import { Connection } from 'typeorm';
import { promiseTimeout } from '../../utils';
import { HealthIndicator } from '../health-indicator';

/**
 * The DatabaseHealthIndicator contains health indicators
 * which are used for health checks related to database
 */
@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator<Connection> {
  /**
   * Initializes the database indicator
   * @param connection The database connection of the application context
   */
  constructor(@Optional() readonly connection: Connection) {
    super(connection);
  }

  /**
   * Pings a database
   * @param connection The connection which the ping should get executed
   * @param timeout The timeout how long the ping should maximum take
   *
   */
  async pingDb(connection: Connection, timeout: number) {
    return await promiseTimeout(timeout, connection.query('SELECT 1'));
  }
}

import { Injectable, Optional } from '@nestjs/common';
import { Connection } from 'typeorm';
import { promiseTimeout } from '../../utils';
import { AbstractDatabaseHealthIndicator } from '../abstract/abstract-database-health-indicator';

/**
 * The TypeOrmeHealthIndicator contains health indicators
 * which are used for health checks related to typeorm
 */
@Injectable()
export class DatabaseHealthIndicator extends AbstractDatabaseHealthIndicator {
  /**
   * Initializes the typeorm indicator
   * @param connection The typeorm connection of the application context
   */
  constructor(@Optional() readonly connection: Connection) {
    super(connection);
  }

  /**
   * Pings a typeorm
   * @param connection The connection which the ping should get executed
   * @param timeout The timeout how long the ping should maximum take
   *
   */
  async pingDb(connection: Connection, timeout: number) {
    return await promiseTimeout(timeout, connection.query('SELECT 1'));
  }
}

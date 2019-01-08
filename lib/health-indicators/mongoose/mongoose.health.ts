import { Injectable, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { promiseTimeout } from '../../utils';
import { AbstractDatabaseHealthIndicator } from '../abstract/abstract-database-health-indicator';

@Injectable()
export class MongooseHealthIndicator extends AbstractDatabaseHealthIndicator {
  /**
   * Initializes the typeorm indicator
   * @param connection The typeorm connection of the application context
   */
  constructor(@Optional() @InjectConnection() readonly connection: Connection) {
    super(connection);
  }

  /**
   * Pings a mongoose connection
   * @param connection The connection which the ping should get executed
   * @param timeout The timeout how long the ping should maximum take
   *
   */
  async pingDb(connection: Connection, timeout: number) {
    return await promiseTimeout(timeout, connection.startSession());
  }
}

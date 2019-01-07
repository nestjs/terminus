import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { promiseTimeout } from '../../utils';
import { HealthIndicator } from '../health-indicator';

@Injectable()
export class MongooseHealthIndicator extends HealthIndicator<Connection> {
  /**
   * Initializes the database indicator
   * @param connection The database connection of the application context
   */
  constructor(@InjectConnection() readonly connection: Connection) {
    super(connection);
  }

  /**
   * Pings a database
   * @param connection The connection which the ping should get executed
   * @param timeout The timeout how long the ping should maximum take
   *
   */
  async pingDb(connection: Connection, timeout: number) {
    return await promiseTimeout(timeout, connection.startSession());
  }
}

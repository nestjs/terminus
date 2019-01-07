/**
 * The settings for the database ping check
 */
import { Connection as MongooseConnection } from 'mongoose';
import { Connection } from 'typeorm';

export interface DatabasePingCheckSettings<
  T extends Connection | MongooseConnection
> {
  /**
   * The connection which the ping check should get executed
   */
  connection?: T;
  /**
   * The amount of time the check should require in ms
   * @default 1000
   */
  timeout?: number;
}

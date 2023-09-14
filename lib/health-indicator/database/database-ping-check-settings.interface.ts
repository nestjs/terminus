/**
 * The settings for the typeorm ping check
 */
import { type Connection as MongooseConnection } from 'mongoose';
import { type DataSource } from 'typeorm';

/**
 * @publicApi
 */
export interface DatabasePingCheckSettings {
  /**
   * The connection which the ping check should get executed
   */
  connection?: DataSource | MongooseConnection;
  /**
   * The amount of time the check should require in ms
   */
  timeout?: number;
}

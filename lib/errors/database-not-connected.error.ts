import { DATABASE_NOT_CONNECTED } from './messages.constant';

/**
 * Error which gets thrown when the database is not connected
 * @publicApi
 */
export class DatabaseNotConnectedError extends Error {
  constructor() {
    super(DATABASE_NOT_CONNECTED);
  }
}

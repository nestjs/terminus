import { Injectable, Optional } from '@nestjs/common';
import { HealthIndicatorResult } from '../..';
import { Connection } from 'typeorm';
import { HealthCheckError } from '@godaddy/terminus';
import { ConnectionNotFoundError } from './connection-not-found.error';
import {
  promiseTimeout,
  TimeoutError as PromiseTimeoutError,
} from '../../utils';
import { TimeoutError } from './timeout-error';

export interface DatabasePingCheckSettings {
  connection?: Connection;
  timeout?: number;
}

@Injectable()
export class DatabaseHealthIndicator {
  constructor(@Optional() private readonly connection: Connection) {}

  private getStatus(
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

  private async pingDb(connection: Connection, timeout: number) {
    return await promiseTimeout(timeout, connection.query('SELECT 1'));
  }

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
            message: `Database did not respond after ${timeout}ms`,
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

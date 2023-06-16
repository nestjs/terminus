import {
  promiseTimeout,
  TimeoutError as PromiseTimeoutError,
} from '../../utils';
import { HealthIndicator } from '../health-indicator';
import { TimeoutError } from '../../errors';
import { HealthCheckError } from '../../health-check';

type PingCommandSignature = { [Key in string]?: number };

type PrismaClientDocument = {
  $runCommandRaw: (command: PingCommandSignature) => any;
};

type PrismaClientSQL = {
  $queryRawUnsafe: (query: string) => any;
};

type PrismaClient = PrismaClientDocument | PrismaClientSQL;

export interface PrismaClientPingCheckSettings {
  /**
   * The amount of time the check should require in ms
   */
  timeout?: number;
}

export class PrismaHealthIndicator extends HealthIndicator {
  constructor() {
    super();
  }

  private async pingDb(timeout: number, prismaClientSQLOrMongo: PrismaClient) {
    // The prisma client generates two different typescript types for different databases
    // but inside they've the same methods
    // But they will fail when using a document method on sql database, that's why we do the try catch down below
    const prismaClient = prismaClientSQLOrMongo as PrismaClientSQL &
      PrismaClientDocument;

    try {
      await promiseTimeout(timeout, prismaClient.$runCommandRaw({ ping: 1 }));
    } catch (error) {
      if (
        error instanceof Error &&
        error.toString().includes('Use the mongodb provider')
      ) {
        await promiseTimeout(timeout, prismaClient.$queryRawUnsafe('SELECT 1'));
        return;
      }

      throw error;
    }
  }

  public async pingCheck(
    key: string,
    prismaClient: PrismaClient,
    options: PrismaClientPingCheckSettings = {},
  ): Promise<any> {
    let isHealthy = false;
    const timeout = options.timeout || 1000;

    try {
      await this.pingDb(timeout, prismaClient);
      isHealthy = true;
    } catch (error) {
      console.log(error);
      if (error instanceof PromiseTimeoutError) {
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

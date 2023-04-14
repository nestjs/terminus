import {
  promiseTimeout,
  TimeoutError as PromiseTimeoutError,
} from '../../utils';
import { HealthIndicator } from '../health-indicator';
import { TimeoutError } from '../../errors';
import { HealthCheckError } from '../../health-check';
import { NotImplementedException } from '@nestjs/common';

type PingCommandSignature = { [Key in string]?: number };

type PrismaClientDocument = {
  $runCommandRaw: (command: PingCommandSignature) => any;
};

type PrismaClientSQL = {
  $queryRawUnsafe: (query: string) => any;
};

type ThePrismaClient = PrismaClientDocument | PrismaClientSQL;

export interface PrismaClientPingCheckSettings {
  /**
   * The amount of time the check should require in ms
   */
  timeout?: number;
}

export class PrismaORMHealthIndicator extends HealthIndicator {
  constructor() {
    super();
  }

  private async pingDb(
    timeout: number,
    prismaClientSQLOrMongo: ThePrismaClient,
  ) {
    // The prisma client generates two different typescript types for different databases
    // but inside they've the same methods
    // But clearly, the will fail, that's why we do the try catch down below
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
    prismaClient: ThePrismaClient,
    options: PrismaClientPingCheckSettings = {},
  ): Promise<any> {
    let isHealthy = false;
    const timeout = options.timeout || 1000;

    try {
      await this.pingDb(timeout, prismaClient);
      isHealthy = true;
    } catch (error) {
      if (error instanceof PromiseTimeoutError) {
        throw new TimeoutError(
          timeout,
          this.getStatus(key, isHealthy, {
            message: `timeout of ${timeout}ms exceeded`,
          }),
        );
      }

      console.log(error);
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

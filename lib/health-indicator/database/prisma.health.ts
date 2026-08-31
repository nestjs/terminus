import { Injectable } from '@nestjs/common';
import { type HealthIndicatorResult } from '../health-indicator-result.interface.js';
import { HealthIndicatorService } from '../health-indicator.service.js';

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

/**
 * The PrismaHealthIndicator contains health indicators
 * which are used for health checks related to Prisma
 *
 * @publicApi
 * @module TerminusModule
 */
@Injectable()
export class PrismaHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  private async pingDb(prismaClientSQLOrMongo: PrismaClient) {
    // The prisma client generates two different typescript types for different databases
    // but inside they've the same methods
    // But they will fail when using a document method on sql database, that's why we do the try catch down below
    const prismaClient = prismaClientSQLOrMongo as PrismaClientSQL &
      PrismaClientDocument;

    try {
      await prismaClient.$runCommandRaw({ ping: 1 });
    } catch (error) {
      if (
        error instanceof Error &&
        error.toString().includes('Use the mongodb provider')
      ) {
        await prismaClient.$queryRawUnsafe('SELECT 1');
        return;
      }

      throw error;
    }
  }

  /**
   * Checks if the Prisma responds in (default) 1000ms and
   * returns a result object corresponding to the result
   *
   * @param key The key which will be used for the result object
   * @param prismaClient PrismaClient
   * @param options The options for the ping
   */
  public async pingCheck<Key extends string = string>(
    key: Key,
    prismaClient: PrismaClient,
    options: PrismaClientPingCheckSettings = {},
  ): Promise<HealthIndicatorResult<Key>> {
    const check = this.healthIndicatorService.check(key);
    const timeout = options.timeout || 1000;

    return check.attempt(() => this.pingDb(prismaClient)).withTimeout(timeout);
  }
}

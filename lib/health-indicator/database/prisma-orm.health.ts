import { checkPackages, promiseTimeout, TimeoutError as PromiseTimeoutError } from "../../utils";
import { HealthIndicator } from "../health-indicator";
import { PrismaClient } from "@prisma/client";
import { TimeoutError } from "../../errors";
import { HealthCheckError } from "../../health-check";

interface ThePrismaClient {
	$queryRaw: (query: string) => Promise<any>;
}

export interface PrismaClientPingCheckSettings {
	/**
	 * The amount of time the check should require in ms
	 */
	timeout?: number;
}

export class PrismaORMHealthIndicator extends HealthIndicator {
	constructor() {
			super();
			this.checkDependantPackages();
	}

	private checkDependantPackages() {
		checkPackages(
			['@prisma/client'],
			this.constructor.name,
		);
	}

	private async pingDb(timeout: number) {
		const prisma = new PrismaClient() as unknown as ThePrismaClient;
		const sqlBasedPrismaCheck = prisma.$queryRaw('SELECT 1');

		return promiseTimeout(timeout, sqlBasedPrismaCheck)
	}

	public async pingCheck(
		key: string,
		options: PrismaClientPingCheckSettings = {},
	): Promise<any> {
		const isHealthy = false;
		const timeout = options.timeout || 1000;

		try {
			await this.pingDb(timeout);
		} catch (error) {
			if(error instanceof PromiseTimeoutError) {
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
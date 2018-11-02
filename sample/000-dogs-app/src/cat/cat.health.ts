import { Injectable } from '@nestjs/common';
import { HealthCheckError } from '@godaddy/terminus';
import { HealthIndicatorResult } from '../../../../lib';

@Injectable()
export class CatHealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isHealthy = true;

    const status = {
      [key]: {
        status: isHealthy ? 'up' : 'down',
      },
    };

    if (!isHealthy) {
      throw new HealthCheckError('Catcheck failed', status);
    } else {
      return status;
    }
  }
}

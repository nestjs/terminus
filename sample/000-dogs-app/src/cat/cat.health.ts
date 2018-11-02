import { Injectable } from '@nestjs/common';
import { HealthIndicator } from '../../../../lib';
import { HealthCheckError } from '@godaddy/terminus';

@Injectable()
export class CatHealthIndicator implements HealthIndicator {
  async isHealthy(key: string) {
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

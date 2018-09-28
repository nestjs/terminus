import { Injectable } from '@nestjs/common';
import { TerminusRegistry, HealthIndicator } from '../../../../lib';
// @ts-ignore
import { HealthCheckError } from '@godaddy/terminus';

@Injectable()
export class CatHealth implements HealthIndicator {
  constructor(terminusRegistry: TerminusRegistry) {
    // This registers the health indicator to terminus
    terminusRegistry.register(this);
  }

  async isHealthy(): Promise<any> {
    const isHealthy = true;

    const status = {
      cat: {
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

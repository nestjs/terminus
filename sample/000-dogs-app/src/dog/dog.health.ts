import { Injectable } from '@nestjs/common';
import { TerminusRegistry, HealthIndicator } from '../../../../lib';
import { DogService } from './dog.service';
import { DogState } from './dog.interface';
// @ts-ignore
import { HealthCheckError } from '@godaddy/terminus';

@Injectable()
export class DogHealth implements HealthIndicator {
  constructor(
    terminusRegistry: TerminusRegistry,
    private readonly dogService: DogService,
  ) {
    // This registers the health indicator to terminus
    terminusRegistry.register(this);
  }

  async isHealthy(): Promise<any> {
    const dogs = await this.dogService.getDogs();
    const goodboys = dogs.filter(dog => dog.state === DogState.GOOD_BOY);
    const badboys = dogs.filter(dog => dog.state === DogState.BAD_BOY);
    const isHealthy = badboys.length === 0;

    const status = {
      dogs: {
        status: isHealthy ? 'up' : 'down',
        goodboys: goodboys.length,
        badboys: badboys.length,
      },
    };

    if (!isHealthy) {
      throw new HealthCheckError('Dogcheck failed', status);
    } else {
      return status;
    }
  }
}

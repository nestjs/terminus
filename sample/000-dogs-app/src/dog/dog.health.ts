import { Injectable } from '@nestjs/common';
import { TerminusRegistry, HealthIndicator } from '../../../../lib';
import { DogService } from './dog.service';
import { DogState } from './dog.interface';

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
    const isHealthy = dogs.some(dog => dog.state !== DogState.BAD_BOY);

    return {
      dogs: {
        status: isHealthy ? 'up' : 'down',
        goodboys: dogs.filter(dog => dog.state === DogState.GOOD_BOY).length,
      },
    };
  }
}

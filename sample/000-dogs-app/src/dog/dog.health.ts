import { Injectable } from '@nestjs/common';
import { DogService } from './dog.service';
import { DogState } from './dog.interface';
import { HealthCheckError } from '@godaddy/terminus';
import { HealthIndicatorResult } from '../../../../lib';

@Injectable()
export class DogHealthIndicator {
  constructor(private readonly dogService: DogService) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const dogs = await this.dogService.getDogs();
    const goodboys = dogs.filter(dog => dog.state === DogState.GOOD_BOY);
    const badboys = dogs.filter(dog => dog.state === DogState.BAD_BOY);
    const isHealthy = badboys.length === 0;

    const status = {
      [key]: {
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

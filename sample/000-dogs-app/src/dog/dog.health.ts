import { Injectable } from '@nestjs/common';
import { DogService } from './dog.service';
import { DogState } from './interfaces/dog.interface';
import {
  HealthIndicatorResult,
  HealthIndicator,
  HealthCheckError,
} from '@nestjs/terminus';

@Injectable()
export class DogHealthIndicator extends HealthIndicator {
  constructor(private readonly dogService: DogService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const dogs = await this.dogService.getDogs();
    const badBoys = dogs.filter(dog => dog.state === DogState.BAD_BOY);
    const isHealthy = badBoys.length === 0;

    const result = this.getStatus(key, isHealthy, { badBoys: badBoys.length });

    if (isHealthy) {
      return result;
    }
    throw new HealthCheckError('Dog check failed', result);
  }
}

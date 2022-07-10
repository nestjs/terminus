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
    const badboys = dogs.filter((dog) => dog.state === DogState.BAD_BOY);
    const isHealthy = badboys.length === 0;

    const result = this.getStatus(key, isHealthy, { badboys: badboys.length });

    if (isHealthy) {
      return result;
    }
    throw new HealthCheckError('Dog check failed', result);
  }
}

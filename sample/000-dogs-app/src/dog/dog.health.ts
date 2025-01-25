import { Injectable } from '@nestjs/common';
import { DogService } from './dog.service';
import { DogState } from './interfaces/dog.interface';
import { HealthIndicatorService } from '@nestjs/terminus';

@Injectable()
export class DogHealthIndicator {
  constructor(
    private readonly dogService: DogService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy<const TKey extends string>(key: TKey) {
    const indicator = this.healthIndicatorService.check(key);

    const dogs = await this.dogService.getDogs();
    const badboys = dogs.filter((dog) => dog.state === DogState.BAD_BOY);
    const isHealthy = badboys.length === 0;

    if (!isHealthy) {
      return indicator.down({
        badboys: badboys.length,
      });
    }

    return indicator.up();
  }
}

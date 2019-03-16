import {
  TerminusOptionsFactory,
  TerminusEndpoint,
  TerminusModuleOptions,
} from '../../../../lib';
import { DogHealthIndicator } from '../dog/dog.health';
import { Inject } from '@nestjs/common';

export class TerminusOptionsService implements TerminusOptionsFactory {
  constructor(
    @Inject(DogHealthIndicator)
    private readonly dogHealthIndicator: DogHealthIndicator,
  ) {}

  public createTerminusOptions(): TerminusModuleOptions {
    const healthEndpoint: TerminusEndpoint = {
      url: '/health',
      healthIndicators: [async () => this.dogHealthIndicator.isHealthy('dog')],
    };
    return {
      endpoints: [healthEndpoint],
    };
  }
}

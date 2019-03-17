import {
  TerminusOptionsFactory,
  TerminusEndpoint,
  TerminusModuleOptions,
} from '../../../../lib';
import { DogHealthIndicator } from '../dog/dog.health';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TerminusOptionsService implements TerminusOptionsFactory {
  constructor(private readonly dogHealthIndicator: DogHealthIndicator) {}

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

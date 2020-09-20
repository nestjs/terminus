import { Controller, Get } from '@nestjs/common';
import { DogHealthIndicator } from '../dog/dog.health';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private dogHealthIndicator: DogHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.dogHealthIndicator.isHealthy('dog')
    ]);
  }
}

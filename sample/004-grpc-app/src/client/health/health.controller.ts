import { Controller, Get } from '@nestjs/common';
import { GrpcOptions } from '@nestjs/microservices';
import { HealthCheck, HealthCheckService, GRPCHealthIndicator } from '@nestjs/terminus';
  
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private grpc: GRPCHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
        async () =>
          this.grpc.checkService<GrpcOptions>('hero_service', 'hero.health.v1', {
            timeout: 2000,
          }),
    ]);
  }
}

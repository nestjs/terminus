import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  SequelizeHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: SequelizeHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([async () => this.db.pingCheck('sequelize')]);
  }
}

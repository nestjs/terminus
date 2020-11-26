import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection()
    private db1Connection: Connection,
    @InjectConnection()
    private db2Connection: Connection,
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      async () => this.db.pingCheck('db1Connection', { connection: this.db1Connection }),
      async () => this.db.pingCheck('db2Connection', { connection: this.db2Connection }),
    ]);
  }
}

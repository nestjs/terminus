import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { HealthCheck, HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection('mongodb1')
    private mongodb1: Connection,
    @InjectConnection('mongodb2')
    private mongodb2: Connection,
    private health: HealthCheckService,
    private mongoose: MongooseHealthIndicator,
  ) {}

  
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      async () => this.mongoose.pingCheck('mongodb1', { connection: this.mongodb1 }),
      async () => this.mongoose.pingCheck('mongodb2', { connection: this.mongodb2 }),
    ]);
  }
}

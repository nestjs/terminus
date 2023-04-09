import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaORMHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaORMHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    this.prisma.$queryRawUnsafe('SELECT 1');
    return this.health.check([
      async () => this.prismaHealth.pingCheck('prisma', this.prisma),
    ]);
  }
}

import { Type } from '@nestjs/common';

import {
  TypeOrmHealthIndicator,
  DNSHealthIndicator,
  MongooseHealthIndicator,
  SequelizeHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
  MicroserviceHealthIndicator,
  HealthIndicator,
  GRPCHealthIndicator,
} from '.';

/**
 * All the health indicators terminus provides as array
 */
export const HEALTH_INDICATORS: Type<HealthIndicator>[] = [
  TypeOrmHealthIndicator,
  DNSHealthIndicator,
  MongooseHealthIndicator,
  SequelizeHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
  MicroserviceHealthIndicator,
  GRPCHealthIndicator,
];

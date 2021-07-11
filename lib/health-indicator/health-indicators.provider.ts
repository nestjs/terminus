import { Type, Provider } from '@nestjs/common';

import {
  TypeOrmHealthIndicator,
  HttpHealthIndicator,
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
  HttpHealthIndicator,
  MongooseHealthIndicator,
  SequelizeHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
  MicroserviceHealthIndicator,
  GRPCHealthIndicator,
];

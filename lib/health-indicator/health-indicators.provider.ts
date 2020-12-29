import { Type } from '@nestjs/common';

import {
  TypeOrmHealthIndicator,
  DNSHealthIndicator,
  MongooseHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
  MicroserviceHealthIndicator,
  HealthIndicator,
  GRPCHealthIndicator,
  HttpResponseHealthIndicator
} from '.';

/**
 * All the health indicators terminus provides as array
 */
export const HEALTH_INDICATORS: Type<HealthIndicator>[] = [
  TypeOrmHealthIndicator,
  DNSHealthIndicator,
  MongooseHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
  MicroserviceHealthIndicator,
  GRPCHealthIndicator,
  HttpResponseHealthIndicator
];

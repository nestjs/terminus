import { Type } from '@nestjs/common';
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
  PrismaHealthIndicator,
} from '.';
import { MikroOrmHealthIndicator } from './database/mikro-orm.health';

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
  MikroOrmHealthIndicator,
  PrismaHealthIndicator,
];

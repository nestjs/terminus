import {
  TypeOrmHealthIndicator,
  HttpHealthIndicator,
  MongooseHealthIndicator,
  SequelizeHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
  MicroserviceHealthIndicator,
  GRPCHealthIndicator,
  PrismaHealthIndicator,
} from './index.js';
import { MikroOrmHealthIndicator } from './database/mikro-orm.health.js';

/**
 * All the health indicators terminus provides as array
 */
export const HEALTH_INDICATORS = [
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

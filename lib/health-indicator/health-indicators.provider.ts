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
} from '.';
import { MikroOrmHealthIndicator } from './database/mikro-orm.health';

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

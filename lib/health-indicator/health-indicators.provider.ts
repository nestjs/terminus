import { MikroOrmHealthIndicator } from './database/mikro-orm.health.js';
import { MongooseHealthIndicator } from './database/mongoose.health.js';
import { PrismaHealthIndicator } from './database/prisma.health.js';
import { SequelizeHealthIndicator } from './database/sequelize.health.js';
import { TypeOrmHealthIndicator } from './database/typeorm.health.js';
import { DiskHealthIndicator } from './disk/disk.health.js';
import { HttpHealthIndicator } from './http/http.health.js';
import { MemoryHealthIndicator } from './memory/memory.health.js';
import { GRPCHealthIndicator } from './microservice/grpc.health.js';
import { MicroserviceHealthIndicator } from './microservice/microservice.health.js';

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

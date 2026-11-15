import { type OnModuleInit } from '@nestjs/common';
import { loadPackage } from '../utils/checkPackage.util.js';
import { MikroOrmHealthIndicator } from './database/mikro-orm.health.js';
import { MongooseHealthIndicator } from './database/mongoose.health.js';
import { SequelizeHealthIndicator } from './database/sequelize.health.js';
import { TypeOrmHealthIndicator } from './database/typeorm.health.js';
import { HttpHealthIndicator } from './http/http.health.js';
import { GRPCHealthIndicator } from './microservice/grpc.health.js';
import { MicroserviceHealthIndicator } from './microservice/microservice.health.js';

vi.mock('../utils/checkPackage.util.js', () => ({
  loadPackage: vi.fn(),
}));

const moduleRef = {} as any;
const healthIndicatorService = {} as any;
const logger = { setContext: vi.fn(), error: vi.fn() } as any;

// Every indicator with an optional peer loads it in `onModuleInit`, so a wiring
// mistake aborts the bootstrap instead of surfacing later as a failing probe.
const indicators: Array<[string, () => OnModuleInit, string[]]> = [
  [
    'TypeOrmHealthIndicator',
    () => new TypeOrmHealthIndicator(moduleRef, healthIndicatorService),
    ['@nestjs/typeorm', 'typeorm'],
  ],
  [
    'SequelizeHealthIndicator',
    () => new SequelizeHealthIndicator(moduleRef, healthIndicatorService),
    ['@nestjs/sequelize', 'sequelize'],
  ],
  [
    'MongooseHealthIndicator',
    () => new MongooseHealthIndicator(moduleRef, healthIndicatorService),
    ['@nestjs/mongoose', 'mongoose'],
  ],
  [
    'MikroOrmHealthIndicator',
    () => new MikroOrmHealthIndicator(moduleRef, healthIndicatorService),
    ['@mikro-orm/nestjs', '@mikro-orm/core'],
  ],
  [
    'HttpHealthIndicator',
    () => new HttpHealthIndicator(logger, healthIndicatorService),
    ['@nestjs/axios'],
  ],
  [
    'MicroserviceHealthIndicator',
    () => new MicroserviceHealthIndicator(healthIndicatorService),
    ['@nestjs/microservices'],
  ],
  [
    'GRPCHealthIndicator',
    () => new GRPCHealthIndicator(healthIndicatorService),
    ['@nestjs/microservices', '@grpc/grpc-js', '@grpc/proto-loader'],
  ],
];

describe('missing optional peer', () => {
  beforeEach(() => vi.mocked(loadPackage).mockReset());

  it.each(indicators)(
    '%s loads its peers on module init',
    async (name, construct, packages) => {
      await construct().onModuleInit();

      expect(loadPackage).toHaveBeenCalledWith(
        packages,
        expect.any(Function),
        name,
      );
    },
  );

  it('propagates the failure so the bootstrap aborts', async () => {
    vi.mocked(loadPackage).mockRejectedValueOnce(
      new Error('The "typeorm" package is missing.'),
    );

    await expect(
      new TypeOrmHealthIndicator(
        moduleRef,
        healthIndicatorService,
      ).onModuleInit(),
    ).rejects.toThrow('The "typeorm" package is missing.');
  });
});

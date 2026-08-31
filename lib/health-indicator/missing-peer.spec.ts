import { assertPackages } from '../utils/checkPackage.util.js';
import { MikroOrmHealthIndicator } from './database/mikro-orm.health.js';
import { MongooseHealthIndicator } from './database/mongoose.health.js';
import { SequelizeHealthIndicator } from './database/sequelize.health.js';
import { TypeOrmHealthIndicator } from './database/typeorm.health.js';
import { HttpHealthIndicator } from './http/http.health.js';
import { GRPCHealthIndicator } from './microservice/grpc.health.js';
import { MicroserviceHealthIndicator } from './microservice/microservice.health.js';

vi.mock('../utils/checkPackage.util.js', () => ({
  assertPackages: vi.fn(),
  loadPackage: vi.fn(),
}));

const moduleRef = {} as any;
const healthIndicatorService = {} as any;
const logger = { setContext: vi.fn(), error: vi.fn() } as any;

// Every indicator with an optional peer checks for it in its constructor, so a
// wiring mistake aborts the bootstrap instead of surfacing later as a failing
// probe.
const indicators: Array<[string, () => unknown, string[]]> = [
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
  beforeEach(() => vi.mocked(assertPackages).mockClear());

  it.each(indicators)(
    '%s checks for its peers',
    (name, construct, packages) => {
      construct();

      expect(assertPackages).toHaveBeenCalledWith(packages, name);
    },
  );

  it('propagates the failure so the bootstrap aborts', () => {
    // `mockImplementationOnce`: the throwing behaviour must not outlive this
    // constructor call, or it leaks into the mock's later use.
    vi.mocked(assertPackages).mockImplementationOnce(() => {
      throw new Error('The "typeorm" package is missing.');
    });

    expect(
      () => new TypeOrmHealthIndicator(moduleRef, healthIndicatorService),
    ).toThrow('The "typeorm" package is missing.');
  });
});

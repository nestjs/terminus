import {
  SIG_NOT_EXIST,
  TerminusBootstrapService,
} from './terminus-bootstrap.service';
import { HttpAdapterHost, ApplicationConfig } from '@nestjs/core';
import { TerminusEndpoint, TerminusModuleOptions } from './interfaces';
import { HealthCheckError, Terminus } from '@godaddy/terminus';
import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { TERMINUS_MODULE_OPTIONS, TERMINUS_LIB } from './terminus.constants';

const httpServer = jest.fn();

const refhostMock = {
  httpAdapter: {
    getHttpServer: jest.fn().mockImplementation(() => httpServer),
  },
};

const applicationConfigMock = {
  getGlobalPrefix: jest.fn().mockImplementation(() => '/health'),
};

const terminusMock = jest.fn();

const upHealthIndicator = jest
  .fn()
  .mockImplementation(() => ({ up: { status: 'up' } }));
const downHealthIndicator = jest.fn().mockImplementation(() => {
  throw new HealthCheckError('Down', { down: { status: 'down' } });
});

const endpoints: TerminusEndpoint[] = [
  {
    healthIndicators: [upHealthIndicator],
    url: '/up',
  },
  {
    url: '/down',
    healthIndicators: [upHealthIndicator, downHealthIndicator],
  },
];

const options: TerminusModuleOptions = { endpoints };

describe('TerminusBootstrapService', () => {
  let bootstrapService: TerminusBootstrapService;
  let terminus: Terminus;
  let module: TestingModuleBuilder;
  let context: TestingModule;
  // let applicationConfig: ApplicationConfig;
  // let httpAdapterHost: HttpAdapterHost;

  beforeEach(async () => {
    module = Test.createTestingModule({
      providers: [
        TerminusBootstrapService,
        {
          provide: TERMINUS_MODULE_OPTIONS,
          useValue: options,
        },
        {
          provide: TERMINUS_LIB,
          useValue: terminusMock,
        },
        {
          provide: HttpAdapterHost,
          useValue: refhostMock,
        },
        {
          provide: ApplicationConfig,
          useValue: applicationConfigMock,
        },
      ],
    });

    context = await module.compile();

    bootstrapService = context.get(TerminusBootstrapService);
    terminus = context.get(TERMINUS_LIB);
    // applicationConfig = module.get(ApplicationConfig);
    // httpAdapterHost = module.get(HttpAdapterHost);
  });
  describe('onApplicationBootstrap', () => {
    it('should ignore bootstrap if there is no HTTP Server', async () => {
      const module = Test.createTestingModule({
        providers: [
          TerminusBootstrapService,
          {
            provide: TERMINUS_MODULE_OPTIONS,
            useValue: options,
          },
          {
            provide: TERMINUS_LIB,
            useValue: terminusMock,
          },
          {
            provide: HttpAdapterHost,
            useValue: null,
          },
          {
            provide: ApplicationConfig,
            useValue: applicationConfigMock,
          },
        ],
      });
      const context = await module.compile();
      const bootstrapService = context.get(TerminusBootstrapService);
      const terminus = context.get(TERMINUS_LIB);

      bootstrapService.onApplicationBootstrap();
      expect(terminus).not.toHaveBeenCalled();
    });
    it('should call the terminus correctly on application bootstrap', () => {
      expect(terminus).not.toHaveBeenCalled();

      bootstrapService.onApplicationBootstrap();

      expect(terminus).toHaveBeenCalledWith(httpServer, {
        healthChecks: {
          '/down': expect.any(Function),
          '/up': expect.any(Function),
        },
        logger: expect.any(Function),
        signal: SIG_NOT_EXIST,
      });
    });

    it('should use the custom logger', async () => {
      const logger = jest.fn();

      const options = context.get(TERMINUS_MODULE_OPTIONS);

      context = await module
        .overrideProvider(TERMINUS_MODULE_OPTIONS)
        .useValue({ logger, ...options })
        .compile();

      bootstrapService = context.get(TerminusBootstrapService);
      terminus = context.get(TERMINUS_LIB);

      bootstrapService.onApplicationBootstrap();

      expect(terminus).toHaveBeenCalledWith(expect.any(Function), {
        healthChecks: expect.any(Object),
        logger,
        signal: SIG_NOT_EXIST,
      });
    });
  });
  describe('prepareHealthChecksMap', () => {
    it('should prepare a correct map', () => {
      const map = bootstrapService.getHealthChecksMap();
      expect(map['/up']).not.toBe(undefined);
      expect(map['/test']).toBe(undefined);
    });

    it('should call the given test indicator', () => {
      const map = bootstrapService.getHealthChecksMap();
      expect(upHealthIndicator).not.toHaveBeenCalled();
      map['/up']();
      expect(upHealthIndicator).toHaveBeenCalled();
      expect(downHealthIndicator).not.toHaveBeenCalled();
    });

    it('should throw an error with causes summary when a health indicator fails', done => {
      const map = bootstrapService.getHealthChecksMap();
      map['/down']().catch((err: HealthCheckError) => {
        expect(err.causes).toEqual({
          down: { status: 'down' },
        });
        done();
      });
    });

    it('should prepend the global prefix when using useGlobalPrefix on TerminusOptions', async () => {
      const options = context.get(TERMINUS_MODULE_OPTIONS);

      context = await module
        .overrideProvider(TERMINUS_MODULE_OPTIONS)
        .useValue({ ...options, useGlobalPrefix: true })
        .compile();

      bootstrapService = context.get(TerminusBootstrapService);

      const map = bootstrapService.getHealthChecksMap();
      expect(map['/health/down']).toBeDefined();
      expect(map['/health/up']).toBeDefined();
      expect(map['/up']).toBeUndefined();
      expect(map['/down']).toBeUndefined();
    });

    it('should prepend the global prefix when using useGlobalPrefix on TerminusEndpoint', async () => {
      const options: TerminusModuleOptions = {
        useGlobalPrefix: false,
        endpoints: [
          {
            useGlobalPrefix: true,
            healthIndicators: [],
            url: '/up',
          },
          {
            useGlobalPrefix: false,
            healthIndicators: [],
            url: 'down',
          },
        ],
      };
      context = await module
        .overrideProvider(TERMINUS_MODULE_OPTIONS)
        .useValue(options)
        .compile();

      bootstrapService = context.get(TerminusBootstrapService);

      const map = bootstrapService.getHealthChecksMap();
      expect(map['/health/up']).toBeDefined();
      expect(map['/down']).toBeDefined();
      expect(map['/up']).toBeUndefined();
      expect(map['down']).toBeUndefined();
    });
  });
});

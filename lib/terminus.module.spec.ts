import { Injectable, LoggerService, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  TerminusModuleOptions,
  TerminusOptionsFactory,
} from './terminus-options.interface';
import { TERMINUS_LOGGER, TERMINUS_MODULE_OPTIONS } from './terminus.constants';
import { TerminusModule } from './terminus.module';
import { HealthCheckService } from './health-check';
import { HealthIndicatorService } from './health-indicator/health-indicator.service';
import { ERROR_LOGGER } from './health-check/error-logger/error-logger.provider';
import { PrettyErrorLogger } from './health-check/error-logger/pretty-error-logger.service';
import { JsonErrorLogger } from './health-check/error-logger/json-error-logger.service';
import { NOOP_LOGGER } from './health-check/logger/noop-logger';
import { GracefulShutdownService } from './graceful-shutdown-timeout/graceful-shutdown-timeout.service';

@Injectable()
class TerminusConfigService implements TerminusOptionsFactory {
  createTerminusOptions(): TerminusModuleOptions {
    return {
      errorLogStyle: 'pretty',
      gracefulShutdownTimeoutMs: 0,
    };
  }
}

@Module({
  providers: [TerminusConfigService],
  exports: [TerminusConfigService],
})
class TerminusConfigModule {}

describe('TerminusModule', () => {
  describe('forRoot', () => {
    it('should compile the module with default options', async () => {
      const module = await Test.createTestingModule({
        imports: [TerminusModule.forRoot()],
      }).compile();

      const healthCheckService = module.get(HealthCheckService);
      expect(healthCheckService).toBeDefined();

      const healthIndicatorService = module.get(HealthIndicatorService);
      expect(healthIndicatorService).toBeDefined();
    });

    it('should compile the module with custom options', async () => {
      const module = await Test.createTestingModule({
        imports: [
          TerminusModule.forRoot({
            errorLogStyle: 'pretty',
            logger: true,
            gracefulShutdownTimeoutMs: 0,
          }),
        ],
      }).compile();

      const healthCheckService = module.get(HealthCheckService);
      expect(healthCheckService).toBeDefined();
    });
  });

  describe('forRootAsync', () => {
    it('should compile the module with useFactory', async () => {
      const module = await Test.createTestingModule({
        imports: [
          TerminusModule.forRootAsync({
            useFactory: () => ({
              errorLogStyle: 'pretty',
              gracefulShutdownTimeoutMs: 0,
            }),
          }),
        ],
      }).compile();

      const healthCheckService = module.get(HealthCheckService);
      expect(healthCheckService).toBeDefined();

      const options = module.get(TERMINUS_MODULE_OPTIONS);
      expect(options).toEqual({
        errorLogStyle: 'pretty',
        gracefulShutdownTimeoutMs: 0,
      });
    });

    it('should compile the module with async useFactory', async () => {
      const module = await Test.createTestingModule({
        imports: [
          TerminusModule.forRootAsync({
            useFactory: async () => ({
              errorLogStyle: 'json',
              gracefulShutdownTimeoutMs: 5000,
            }),
          }),
        ],
      }).compile();

      const options = module.get(TERMINUS_MODULE_OPTIONS);
      expect(options).toEqual({
        errorLogStyle: 'json',
        gracefulShutdownTimeoutMs: 5000,
      });
    });

    it('should compile the module with useFactory and inject', async () => {
      const CONFIG_VALUE = 'CONFIG_VALUE';

      @Module({
        providers: [{ provide: CONFIG_VALUE, useValue: 'pretty' }],
        exports: [{ provide: CONFIG_VALUE, useValue: 'pretty' }],
      })
      class ConfigModule {}

      const module = await Test.createTestingModule({
        imports: [
          TerminusModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configValue: string) => ({
              errorLogStyle: configValue as 'pretty' | 'json',
            }),
            inject: [CONFIG_VALUE],
          }),
        ],
      }).compile();

      const options = module.get(TERMINUS_MODULE_OPTIONS);
      expect(options).toEqual({
        errorLogStyle: 'pretty',
      });
    });

    it('should compile the module with useClass', async () => {
      const module = await Test.createTestingModule({
        imports: [
          TerminusModule.forRootAsync({
            useClass: TerminusConfigService,
          }),
        ],
      }).compile();

      const healthCheckService = module.get(HealthCheckService);
      expect(healthCheckService).toBeDefined();

      const options = module.get(TERMINUS_MODULE_OPTIONS);
      expect(options).toEqual({
        errorLogStyle: 'pretty',
        gracefulShutdownTimeoutMs: 0,
      });
    });

    it('should compile the module with useExisting', async () => {
      const module = await Test.createTestingModule({
        imports: [
          TerminusConfigModule,
          TerminusModule.forRootAsync({
            useExisting: TerminusConfigService,
            imports: [TerminusConfigModule],
          }),
        ],
      }).compile();

      const healthCheckService = module.get(HealthCheckService);
      expect(healthCheckService).toBeDefined();

      const options = module.get(TERMINUS_MODULE_OPTIONS);
      expect(options).toEqual({
        errorLogStyle: 'pretty',
        gracefulShutdownTimeoutMs: 0,
      });
    });

    it('should include imports from async options', async () => {
      const module = await Test.createTestingModule({
        imports: [
          TerminusModule.forRootAsync({
            imports: [TerminusConfigModule],
            useExisting: TerminusConfigService,
          }),
        ],
      }).compile();

      const healthCheckService = module.get(HealthCheckService);
      expect(healthCheckService).toBeDefined();
    });

    it('should return the dynamic module metadata', () => {
      const dynamicModule = TerminusModule.forRootAsync({
        useFactory: () => ({}),
      });

      expect(dynamicModule.module).toBe(TerminusModule);
      expect(dynamicModule.providers).toBeDefined();
      expect(dynamicModule.providers!.length).toBeGreaterThan(0);
    });

    it('should return the dynamic module metadata with imports', () => {
      const dynamicModule = TerminusModule.forRootAsync({
        imports: [TerminusConfigModule],
        useFactory: () => ({}),
      });

      expect(dynamicModule.imports).toEqual([TerminusConfigModule]);
    });

    it('should default imports to empty array when not provided', () => {
      const dynamicModule = TerminusModule.forRootAsync({
        useFactory: () => ({}),
      });

      expect(dynamicModule.imports).toEqual([]);
    });
  });

  describe('forRoot - provider resolution', () => {
    it('should resolve ERROR_LOGGER as JsonErrorLogger by default', async () => {
      const module = await Test.createTestingModule({
        imports: [TerminusModule.forRoot()],
      }).compile();

      const errorLogger = module.get(ERROR_LOGGER);
      expect(errorLogger).toBeInstanceOf(JsonErrorLogger);
    });

    it('should resolve ERROR_LOGGER as PrettyErrorLogger when errorLogStyle is "pretty"', async () => {
      const module = await Test.createTestingModule({
        imports: [TerminusModule.forRoot({ errorLogStyle: 'pretty' })],
      }).compile();

      const errorLogger = module.get(ERROR_LOGGER);
      expect(errorLogger).toBeInstanceOf(PrettyErrorLogger);
    });

    it('should resolve TERMINUS_LOGGER as NOOP_LOGGER when logger is false', async () => {
      const module = await Test.createTestingModule({
        imports: [TerminusModule.forRoot({ logger: false })],
      }).compile();

      const logger = module.get(TERMINUS_LOGGER);
      expect(logger).toBe(NOOP_LOGGER);
    });

    it('should resolve TERMINUS_LOGGER as a Logger instance when logger is true', async () => {
      const module = await Test.createTestingModule({
        imports: [TerminusModule.forRoot({ logger: true })],
      }).compile();

      const logger = module.get(TERMINUS_LOGGER);
      expect(logger).toBeDefined();
      expect(logger.log).toBeDefined();
    });

    it('should resolve TERMINUS_MODULE_OPTIONS with provided values', async () => {
      const opts: TerminusModuleOptions = {
        errorLogStyle: 'pretty',
        gracefulShutdownTimeoutMs: 3000,
      };
      const module = await Test.createTestingModule({
        imports: [TerminusModule.forRoot(opts)],
      }).compile();

      const options = module.get(TERMINUS_MODULE_OPTIONS);
      expect(options).toEqual(opts);
    });

    it('should resolve GracefulShutdownService', async () => {
      const module = await Test.createTestingModule({
        imports: [TerminusModule.forRoot()],
      }).compile();

      const service = module.get(GracefulShutdownService);
      expect(service).toBeDefined();
    });
  });

  describe('forRootAsync - provider resolution', () => {
    it('should resolve ERROR_LOGGER via async useFactory', async () => {
      const module = await Test.createTestingModule({
        imports: [
          TerminusModule.forRootAsync({
            useFactory: () => ({ errorLogStyle: 'pretty' as const }),
          }),
        ],
      }).compile();

      const errorLogger = module.get(ERROR_LOGGER);
      expect(errorLogger).toBeInstanceOf(PrettyErrorLogger);
    });

    it('should resolve TERMINUS_LOGGER via async useFactory with logger false', async () => {
      const module = await Test.createTestingModule({
        imports: [
          TerminusModule.forRootAsync({
            useFactory: () => ({ logger: false }),
          }),
        ],
      }).compile();

      const logger = module.get(TERMINUS_LOGGER);
      expect(logger).toBe(NOOP_LOGGER);
    });

    it('should resolve custom logger class via async useFactory', async () => {
      class CustomLogger implements LoggerService {
        log() {}
        error() {}
        warn() {}
      }

      const module = await Test.createTestingModule({
        imports: [
          TerminusModule.forRootAsync({
            useFactory: () => ({ logger: CustomLogger }),
          }),
        ],
      }).compile();

      const logger = module.get(TERMINUS_LOGGER);
      expect(logger).toBeInstanceOf(CustomLogger);
    });

    it('should resolve options via useClass', async () => {
      const module = await Test.createTestingModule({
        imports: [
          TerminusModule.forRootAsync({
            useClass: TerminusConfigService,
          }),
        ],
      }).compile();

      const errorLogger = module.get(ERROR_LOGGER);
      expect(errorLogger).toBeInstanceOf(PrettyErrorLogger);
    });

    it('should resolve GracefulShutdownService with async options', async () => {
      const module = await Test.createTestingModule({
        imports: [
          TerminusModule.forRootAsync({
            useFactory: () => ({ gracefulShutdownTimeoutMs: 5000 }),
          }),
        ],
      }).compile();

      const service = module.get(GracefulShutdownService);
      expect(service).toBeDefined();
    });
  });
});

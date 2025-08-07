import { Test } from '@nestjs/testing';
import { Injectable, Module } from '@nestjs/common';
import { TerminusModule } from './terminus.module';
import { HealthCheckService } from './health-check';
import { HealthIndicatorService } from './health-indicator/health-indicator.service';
import {
  type TerminusModuleOptions,
  type TerminusModuleOptionsFactory,
} from './terminus-options.interface';
import { TERMINUS_MODULE_OPTIONS } from './terminus.constants';
import { TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT } from './graceful-shutdown-timeout/graceful-shutdown-timeout.service';

@Injectable()
class MockConfigService {
  get(key: string, defaultValue?: any) {
    const config: Record<string, any> = {
      TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT: 16000,
      TERMINUS_ERROR_LOG_STYLE: 'pretty',
      TERMINUS_LOGGER_ENABLED: true,
    };
    return config[key] ?? defaultValue;
  }
}

@Injectable()
class OptionsFactory implements TerminusModuleOptionsFactory {
  constructor(private configService: MockConfigService) {}

  createTerminusOptions(): TerminusModuleOptions {
    return {
      gracefulShutdownTimeoutMs: this.configService.get(
        'TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT',
        0,
      ),
      errorLogStyle: this.configService.get('TERMINUS_ERROR_LOG_STYLE', 'json'),
      logger: this.configService.get('TERMINUS_LOGGER_ENABLED', true),
    };
  }
}

describe('TerminusModule', () => {
  describe('forRoot', () => {
    it('should create module with default options', async () => {
      const module = await Test.createTestingModule({
        imports: [TerminusModule.forRoot()],
      }).compile();

      const healthCheckService = module.get(HealthCheckService);
      const healthIndicatorService = module.get(HealthIndicatorService);

      expect(healthCheckService).toBeDefined();
      expect(healthIndicatorService).toBeDefined();
    });

    it('should create module with custom options', async () => {
      const module = await Test.createTestingModule({
        imports: [
          TerminusModule.forRoot({
            gracefulShutdownTimeoutMs: 5000,
            errorLogStyle: 'pretty',
            logger: true,
          }),
        ],
      }).compile();

      const healthCheckService = module.get(HealthCheckService);
      const gracefulShutdownTimeout = module.get(
        TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT,
      );

      expect(healthCheckService).toBeDefined();
      expect(gracefulShutdownTimeout).toBe(5000);
    });
  });

  describe('forRootAsync', () => {
    it('should create module with useFactory', async () => {
      @Module({
        providers: [MockConfigService],
        exports: [MockConfigService],
      })
      class ConfigModule {}

      const module = await Test.createTestingModule({
        imports: [
          TerminusModule.forRootAsync({
            imports: [ConfigModule],
            inject: [MockConfigService],
            useFactory: (configService: MockConfigService) => ({
              gracefulShutdownTimeoutMs: configService.get(
                'TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT',
                16000,
              ),
              errorLogStyle: configService.get(
                'TERMINUS_ERROR_LOG_STYLE',
                'json',
              ),
              logger: configService.get('TERMINUS_LOGGER_ENABLED', true),
            }),
          }),
        ],
      }).compile();

      const healthCheckService = module.get(HealthCheckService);
      const healthIndicatorService = module.get(HealthIndicatorService);
      const moduleOptions = module.get(TERMINUS_MODULE_OPTIONS);
      const gracefulShutdownTimeout = module.get(
        TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT,
      );

      expect(healthCheckService).toBeDefined();
      expect(healthIndicatorService).toBeDefined();
      expect(moduleOptions).toEqual({
        gracefulShutdownTimeoutMs: 16000,
        errorLogStyle: 'pretty',
        logger: true,
      });
      expect(gracefulShutdownTimeout).toBe(16000);
    });

    it('should create module with useClass', async () => {
      @Module({
        providers: [MockConfigService],
        exports: [MockConfigService],
      })
      class ConfigModule {}

      const module = await Test.createTestingModule({
        imports: [
          TerminusModule.forRootAsync({
            imports: [ConfigModule],
            useClass: OptionsFactory,
          }),
        ],
      }).compile();

      const healthCheckService = module.get(HealthCheckService);
      const healthIndicatorService = module.get(HealthIndicatorService);
      const moduleOptions = module.get(TERMINUS_MODULE_OPTIONS);

      expect(healthCheckService).toBeDefined();
      expect(healthIndicatorService).toBeDefined();
      expect(moduleOptions).toEqual({
        gracefulShutdownTimeoutMs: 16000,
        errorLogStyle: 'pretty',
        logger: true,
      });
    });

    it('should create module with useExisting', async () => {
      @Module({
        providers: [MockConfigService, OptionsFactory],
        exports: [MockConfigService, OptionsFactory],
      })
      class ConfigModule {}

      const module = await Test.createTestingModule({
        imports: [
          TerminusModule.forRootAsync({
            imports: [ConfigModule],
            useExisting: OptionsFactory,
          }),
        ],
      }).compile();

      const healthCheckService = module.get(HealthCheckService);
      const healthIndicatorService = module.get(HealthIndicatorService);
      const moduleOptions = module.get(TERMINUS_MODULE_OPTIONS);

      expect(healthCheckService).toBeDefined();
      expect(healthIndicatorService).toBeDefined();
      expect(moduleOptions).toEqual({
        gracefulShutdownTimeoutMs: 16000,
        errorLogStyle: 'pretty',
        logger: true,
      });
    });

    it('should create module with async factory returning promise', async () => {
      @Module({
        providers: [MockConfigService],
        exports: [MockConfigService],
      })
      class ConfigModule {}

      const module = await Test.createTestingModule({
        imports: [
          TerminusModule.forRootAsync({
            imports: [ConfigModule],
            inject: [MockConfigService],
            useFactory: async (configService: MockConfigService) => {
              await new Promise((resolve) => setTimeout(resolve, 10));
              return {
                gracefulShutdownTimeoutMs: configService.get(
                  'TERMINUS_GRACEFUL_SHUTDOWN_TIMEOUT',
                  16000,
                ),
                errorLogStyle: configService.get(
                  'TERMINUS_ERROR_LOG_STYLE',
                  'json',
                ),
                logger: configService.get('TERMINUS_LOGGER_ENABLED', true),
              };
            },
          }),
        ],
      }).compile();

      const healthCheckService = module.get(HealthCheckService);
      const moduleOptions = module.get(TERMINUS_MODULE_OPTIONS);

      expect(healthCheckService).toBeDefined();
      expect(moduleOptions).toEqual({
        gracefulShutdownTimeoutMs: 16000,
        errorLogStyle: 'pretty',
        logger: true,
      });
    });

    it('should throw error when no configuration method is provided', () => {
      expect(() => {
        TerminusModule.forRootAsync({} as any);
      }).toThrow('Invalid TerminusModule async options');
    });
  });
});

import { Injectable, Logger, type LoggerService } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HealthIndicatorService } from './health-indicator.service.js';
import { TERMINUS_LOGGER } from '../../terminus.constants.js';
import { TerminusModule } from '../../terminus.module.js';

@Injectable()
class CustomLogger implements LoggerService {
  log = vi.fn();
  error = vi.fn();
  warn = vi.fn();
}

describe('HealthIndicatorService', () => {
  // Warnings are logged once per indicator key for the whole process, so each
  // test uses its own key: the test name.
  const key = () => expect.getState().currentTestName!;

  // The returned value of `attempt()` is deprecated and logs a warning
  const warnOnce = (service: HealthIndicatorService) =>
    service.check(key()).attempt(() => ({ ok: 1 }));

  let nestWarn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    nestWarn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log the warnings with the Nest logger by default', async () => {
    const module = await Test.createTestingModule({
      imports: [TerminusModule.forRoot()],
    }).compile();

    await warnOnce(module.get(HealthIndicatorService));

    expect(nestWarn).toHaveBeenCalledWith(
      expect.stringContaining(`"${key()}"`),
      'HealthIndicatorService',
    );
  });

  it('should log no warning with logger: false', async () => {
    const module = await Test.createTestingModule({
      imports: [TerminusModule.forRoot({ logger: false })],
    }).compile();

    await warnOnce(module.get(HealthIndicatorService));

    expect(nestWarn).not.toHaveBeenCalled();
  });

  it('should log the warnings with a custom logger', async () => {
    const module = await Test.createTestingModule({
      imports: [TerminusModule.forRoot({ logger: CustomLogger })],
    }).compile();

    await warnOnce(module.get(HealthIndicatorService));

    expect(nestWarn).not.toHaveBeenCalled();
    expect(module.get<CustomLogger>(TERMINUS_LOGGER).warn).toHaveBeenCalledWith(
      expect.stringContaining(`"${key()}"`),
      'HealthIndicatorService',
    );
  });

  it('should log the warnings with a custom logger from forRootAsync', async () => {
    const logger = new CustomLogger();
    const module = await Test.createTestingModule({
      imports: [
        TerminusModule.forRootAsync({ useFactory: () => ({ logger }) }),
      ],
    }).compile();

    await warnOnce(module.get(HealthIndicatorService));

    expect(nestWarn).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`"${key()}"`),
      'HealthIndicatorService',
    );
  });

  it('should log no warning with logger: false from forRootAsync', async () => {
    const module = await Test.createTestingModule({
      imports: [
        TerminusModule.forRootAsync({ useFactory: () => ({ logger: false }) }),
      ],
    }).compile();

    await warnOnce(module.get(HealthIndicatorService));

    expect(nestWarn).not.toHaveBeenCalled();
  });
});

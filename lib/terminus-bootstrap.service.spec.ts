import { TerminusBootstrapService } from './terminus-bootstrap.service';
import { ApplicationReferenceHost } from '@nestjs/core';
import { TerminusEndpoint, TerminusModuleOptions } from './interfaces';

const httpServer = jest.fn();

const refhostMock = {
  applicationRef: {
    getHttpServer: jest.fn().mockImplementation(() => httpServer),
  },
};

const terminus = jest.fn();

const testHealthIndicator = jest.fn();

const endpoints: TerminusEndpoint[] = [
  {
    healthIndicators: [testHealthIndicator],
    url: '/health',
  },
];

const options: TerminusModuleOptions = { endpoints };

describe('TerminusBootstrapService', () => {
  it('should call the terminus correctly on application bootstrap', () => {
    const bootstrapService = new TerminusBootstrapService(
      options,
      terminus,
      refhostMock as ApplicationReferenceHost,
    );

    expect(terminus).not.toHaveBeenCalled();

    bootstrapService.onApplicationBootstrap();

    expect(terminus).toHaveBeenCalledWith(httpServer, {
      healthChecks: { '/health': expect.any(Function) },
      logger: expect.any(Function),
    });
  });

  it('should use the custom logger', () => {
    const logger = jest.fn();

    const bootstrapService = new TerminusBootstrapService(
      { ...options, logger },
      terminus,
      refhostMock as ApplicationReferenceHost,
    );

    bootstrapService.onApplicationBootstrap();

    expect(terminus).toHaveBeenCalledWith(expect.any(Function), {
      healthChecks: expect.any(Object),
      logger,
    });
  });
});

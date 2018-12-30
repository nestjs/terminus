import { TerminusBootstrapService } from './terminus-bootstrap.service';
import { ApplicationReferenceHost } from '@nestjs/core';
import { TerminusEndpoint, TerminusModuleOptions } from './interfaces';
import { HealthCheckError } from '@godaddy/terminus';

const httpServer = jest.fn();

const refhostMock = {
  applicationRef: {
    getHttpServer: jest.fn().mockImplementation(() => httpServer),
  },
};

const terminus = jest.fn();

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
  describe('onApplicationBootstrap', () => {
    it('should call the terminus correctly on application bootstrap', () => {
      const bootstrapService = new TerminusBootstrapService(
        options,
        terminus,
        refhostMock as ApplicationReferenceHost,
      );

      expect(terminus).not.toHaveBeenCalled();

      bootstrapService.onApplicationBootstrap();

      expect(terminus).toHaveBeenCalledWith(httpServer, {
        healthChecks: {
          '/down': expect.any(Function),
          '/up': expect.any(Function),
        },
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
  describe('prepareHealthChecksMap', () => {
    let bootstrapService: TerminusBootstrapService;

    beforeEach(() => {
      bootstrapService = new TerminusBootstrapService(
        options,
        terminus,
        refhostMock as ApplicationReferenceHost,
      );
    });

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
  });
});

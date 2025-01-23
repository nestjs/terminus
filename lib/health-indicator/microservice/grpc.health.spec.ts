import { GRPCHealthIndicator } from './grpc.health';
import { checkPackages } from '../../utils/checkPackage.util';
import { GrpcOptions, Transport } from '@nestjs/microservices';
import { TimeoutError } from '../../errors';
import { HealthCheckError } from '../../health-check/health-check.error';
import { Test } from '@nestjs/testing';
import { HealthIndicatorService } from '../health-indicator.service';

jest.mock('../../utils/checkPackage.util');

// == MOCKS ==
const healthServiceMock = {
  check: jest.fn().mockImplementation((): any => ({
    toPromise: () => Promise.resolve({ status: 1 }),
  })),
};

const grpcClientMock = {
  getService: jest.fn().mockImplementation((): any => healthServiceMock),
};

const clientProxyFactoryMock = {
  create: jest.fn().mockImplementation((): any => grpcClientMock),
};

const nestJSMicroservicesMock = {
  ClientProxyFactory: clientProxyFactoryMock,
};

describe('GRPCHealthIndicator', () => {
  let grpc: GRPCHealthIndicator;
  beforeEach(async () => {
    (checkPackages as jest.Mock).mockImplementation((): any => [
      nestJSMicroservicesMock,
    ]);

    const moduleRef = await Test.createTestingModule({
      providers: [GRPCHealthIndicator, HealthIndicatorService],
    }).compile();
    grpc = await moduleRef.resolve(GRPCHealthIndicator);
  });

  afterEach(async () => {
    clientProxyFactoryMock.create.mockClear();
    grpcClientMock.getService.mockClear();
    healthServiceMock.check.mockClear();
  });

  describe('checkService', () => {
    it('should return a healthy result', async () => {
      const result = await grpc.checkService<GrpcOptions>('grpc', 'test');
      expect(result).toEqual({
        grpc: { servingStatus: 'SERVING', status: 'up', statusCode: 1 },
      });
    });

    it('should correctly call the ClientProxyFactory with default', async () => {
      await grpc.checkService<GrpcOptions>('grpc', 'test');
      expect(clientProxyFactoryMock.create.mock.calls[0][0]).toEqual({
        options: { package: 'grpc.health.v1', protoPath: expect.anything() },
        transport: Transport.GRPC,
      });
    });

    it('should correctly all the ClientProxyFactory with custom options', async () => {
      await grpc.checkService<GrpcOptions>('grpc', 'test', {
        protoPath: 'test.proto',
        timeout: 100,
        package: 'grpc.health.v2',
      });
      expect(clientProxyFactoryMock.create.mock.calls[0][0]).toEqual({
        options: { package: 'grpc.health.v2', protoPath: 'test.proto' },
        transport: Transport.GRPC,
      });
    });

    it('should throw an error in case the health service returns a faulty response code', async () => {
      healthServiceMock.check.mockImplementationOnce((): any => ({
        toPromise: (): any => Promise.resolve({ status: 0 }),
      }));
      try {
        await grpc.checkService<GrpcOptions>('grpc', 'test');
      } catch (err) {}
    });

    it('should throw an error when the timeout runs out', async () => {
      try {
        await grpc.checkService<GrpcOptions>('grpc', 'test', { timeout: 0 });
      } catch (err) {
        expect(err instanceof TimeoutError).toBeTruthy();
      }
    });

    it('should use the custom healthServiceCheck function', async () => {
      const healthServiceCheck = jest
        .fn()
        .mockImplementation((): any => ({ status: 1 }));

      await grpc.checkService<GrpcOptions>('grpc', 'test', {
        healthServiceCheck,
      });

      expect(healthServiceCheck.mock.calls.length).toBe(1);
    });

    it('should use the custom healthServiceName', async () => {
      await grpc.checkService<GrpcOptions>('grpc', 'test', {
        healthServiceName: 'health2',
      });
      expect(grpcClientMock.getService.mock.calls[0][0]).toBe('health2');
    });

    it('should throw TypeError further in client.getService', async () => {
      const error = new TypeError('test');
      grpcClientMock.getService.mockImplementationOnce((): any => {
        throw error;
      });
      try {
        await grpc.checkService<GrpcOptions>('grpc', 'test');
      } catch (err) {
        expect(err).toEqual(error);
      }
    });

    it('should throw HealthCheckError in client.getService', async () => {
      const error = new Error('test');
      grpcClientMock.getService.mockImplementationOnce((): any => {
        throw error;
      });

      try {
        await grpc.checkService<GrpcOptions>('grpc', 'test');
      } catch (err) {
        expect(err instanceof HealthCheckError).toBeTruthy();
      }
    });

    it('should throw HealthCheckError if the grpc check function fails', async () => {
      try {
        await grpc.checkService<GrpcOptions>('grpc', 'test', {
          healthServiceCheck: () => {
            throw new Error('test');
          },
        });
      } catch (err) {
        expect(err instanceof HealthCheckError).toBeTruthy();
      }
    });
  });
});

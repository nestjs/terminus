import { GRPCHealthIndicator } from './grpc.health.js';
import { loadPackage } from '../../utils/checkPackage.util.js';
import { GrpcOptions, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { HealthIndicatorService } from '../health-indicator.service.js';
import { NEVER, of } from 'rxjs';

vi.mock('../../utils/checkPackage.util.js', () => ({
  assertPackages: vi.fn(),
  loadPackage: vi.fn(),
}));

// == MOCKS ==
const healthServiceMock = {
  check: vi.fn().mockImplementation((): any => of({ status: 1 })),
};

const grpcClientMock = {
  getService: vi.fn().mockImplementation((): any => healthServiceMock),
  close: vi.fn(),
};

const clientProxyFactoryMock = {
  create: vi.fn().mockImplementation((): any => grpcClientMock),
};

const nestJSMicroservicesMock = {
  ClientProxyFactory: clientProxyFactoryMock,
  Transport,
};

describe('GRPCHealthIndicator', () => {
  let grpc: GRPCHealthIndicator;
  beforeEach(async () => {
    vi.mocked(loadPackage).mockResolvedValue(nestJSMicroservicesMock);

    const moduleRef = await Test.createTestingModule({
      providers: [GRPCHealthIndicator, HealthIndicatorService],
    }).compile();
    grpc = await moduleRef.resolve(GRPCHealthIndicator);
  });

  afterEach(async () => {
    clientProxyFactoryMock.create.mockClear();
    grpcClientMock.getService.mockClear();
    grpcClientMock.close.mockClear();
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

    it('should reuse the client for the same key and create one per key', async () => {
      await grpc.checkService<GrpcOptions>('a', 'test', { url: 'a:50051' });
      await grpc.checkService<GrpcOptions>('a', 'test', { url: 'a:50051' });
      await grpc.checkService<GrpcOptions>('b', 'test', { url: 'b:50051' });
      expect(clientProxyFactoryMock.create).toHaveBeenCalledTimes(2);
    });

    it('should close the clients on shutdown', async () => {
      await grpc.checkService<GrpcOptions>('grpc', 'test');
      grpc.onApplicationShutdown();
      expect(grpcClientMock.close).toHaveBeenCalledTimes(1);
    });

    it('should be down in case the health service returns a faulty response code', async () => {
      healthServiceMock.check.mockImplementationOnce((): any =>
        of({ status: 2 }),
      );
      const result = await grpc.checkService<GrpcOptions>('grpc', 'test');
      expect(result).toEqual({
        grpc: { status: 'down', message: 'serving status: NOT_SERVING' },
      });
    });

    it('should be down when the timeout runs out', async () => {
      healthServiceMock.check.mockImplementationOnce((): any => NEVER);
      const result = await grpc.checkService<GrpcOptions>('grpc', 'test', {
        timeout: 10,
      });
      expect(result).toEqual({
        grpc: { status: 'down', message: 'timeout of 10ms exceeded' },
      });
    });

    it('should be down when the client cannot be created', async () => {
      clientProxyFactoryMock.create.mockImplementationOnce((): any => {
        throw new Error('ENOENT: no such file or directory');
      });
      const result = await grpc.checkService<GrpcOptions>('grpc', 'test');
      expect(result).toEqual({
        grpc: { status: 'down', message: 'ENOENT: no such file or directory' },
      });
    });

    it('should use the custom healthServiceCheck function', async () => {
      const healthServiceCheck = vi
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
      await expect(grpc.checkService<GrpcOptions>('grpc', 'test')).rejects.toBe(
        error,
      );
    });
  });
});

import { expectTypeOf } from 'vitest';
import { GRPCHealthIndicator } from './grpc.health.js';
import { loadPackage } from '../../utils/checkPackage.util.js';
import { GrpcOptions, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { HealthIndicatorService } from '../service/health-indicator.service.js';
import { NEVER, of, throwError } from 'rxjs';
import * as grpcJs from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { join } from 'node:path';

vi.mock('../../utils/checkPackage.util.js', () => ({
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
  it('types the failure data on a failed result', () => {
    type Entry = Awaited<
      ReturnType<GRPCHealthIndicator['checkService']>
    >[string];
    type Failure = Extract<Entry, { message: string }>;
    expectTypeOf<Failure['code']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<Failure['servingStatus']>().toEqualTypeOf<
      string | number | undefined
    >();
  });

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
        grpc: {
          servingStatus: 'SERVING',
          status: 'up',
          statusCode: 1,
          responseTime: expect.any(Number),
        },
      });
    });

    it('should keep its own data when the user adds data to the attempt', async () => {
      const result = await grpc
        .checkService<GrpcOptions>('grpc', 'test')
        .withData({ owner: 'team-heroes' })
        .withSuccessData({ region: 'eu' });
      expect(result).toEqual({
        grpc: {
          status: 'up',
          statusCode: 1,
          servingStatus: 'SERVING',
          owner: 'team-heroes',
          region: 'eu',
          responseTime: expect.any(Number),
        },
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

    it('should create a single client for concurrent checks with the same key', async () => {
      await Promise.all([
        grpc.checkService<GrpcOptions>('a', 'test', { url: 'a:50051' }),
        grpc.checkService<GrpcOptions>('a', 'test', { url: 'a:50051' }),
      ]);
      expect(clientProxyFactoryMock.create).toHaveBeenCalledTimes(1);

      // Every client that was created is closed on shutdown
      grpc.onApplicationShutdown();
      expect(grpcClientMock.close).toHaveBeenCalledTimes(1);
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
        grpc: {
          status: 'down',
          message: 'serving status: NOT_SERVING',
          statusCode: 2,
          servingStatus: 'NOT_SERVING',
          responseTime: expect.any(Number),
        },
      });
    });

    it('should add the gRPC status code when the call fails', async () => {
      healthServiceMock.check.mockImplementationOnce((): any =>
        throwError(() =>
          Object.assign(
            new Error('14 UNAVAILABLE: No connection established'),
            {
              code: 14,
              details: 'No connection established',
              metadata: {},
            },
          ),
        ),
      );
      const result = await grpc.checkService<GrpcOptions>('grpc', 'test');
      expect(result).toEqual({
        grpc: {
          status: 'down',
          message: '14 UNAVAILABLE: No connection established',
          code: 14,
          responseTime: expect.any(Number),
        },
      });
    });

    it('should be down when the timeout runs out', async () => {
      healthServiceMock.check.mockImplementationOnce((): any => NEVER);
      const result = await grpc.checkService<GrpcOptions>('grpc', 'test', {
        timeout: 10,
      });
      expect(result).toEqual({
        grpc: {
          status: 'down',
          message: 'timeout of 10ms exceeded',
          responseTime: expect.any(Number),
        },
      });
    });

    it('should use the default timeout when the timeout is undefined', async () => {
      healthServiceMock.check.mockImplementationOnce((): any => NEVER);
      const result = await grpc.checkService<GrpcOptions>('grpc', 'test', {
        timeout: undefined,
      });
      expect(result).toEqual({
        grpc: {
          status: 'down',
          message: 'timeout of 1000ms exceeded',
          responseTime: expect.any(Number),
        },
      });
    });

    it('should be down when the client cannot be created', async () => {
      clientProxyFactoryMock.create.mockImplementationOnce((): any => {
        throw new Error('ENOENT: no such file or directory');
      });
      const result = await grpc.checkService<GrpcOptions>('grpc', 'test');
      expect(result).toEqual({
        grpc: {
          status: 'down',
          message: 'ENOENT: no such file or directory',
          responseTime: expect.any(Number),
        },
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

    it('should be down when client.getService throws a TypeError', async () => {
      grpcClientMock.getService.mockImplementationOnce((): any => {
        throw new TypeError('test');
      });
      const result = await grpc.checkService<GrpcOptions>('grpc', 'test');
      expect(result).toEqual({
        grpc: {
          status: 'down',
          message: 'test',
          responseTime: expect.any(Number),
        },
      });
    });
  });
});

describe('GRPCHealthIndicator with a real gRPC server', () => {
  const protoPath = join(import.meta.dirname, 'protos/health.proto');
  let grpc: GRPCHealthIndicator;
  let server: grpcJs.Server;
  let url: string;

  beforeAll(async () => {
    const definition = grpcJs.loadPackageDefinition(
      protoLoader.loadSync(protoPath),
    ) as any;
    server = new grpcJs.Server();
    server.addService(definition.grpc.health.v1.Health.service, {
      check: (call: any, callback: any) =>
        callback(null, { status: call.request.service === 'ok' ? 1 : 2 }),
    });
    const port = await new Promise<number>((resolve, reject) =>
      server.bindAsync(
        '127.0.0.1:0',
        grpcJs.ServerCredentials.createInsecure(),
        (err, p) => (err ? reject(err) : resolve(p)),
      ),
    );
    url = `127.0.0.1:${port}`;
  });

  afterAll(() => server.forceShutdown());

  beforeEach(async () => {
    vi.mocked(loadPackage).mockResolvedValue(
      await import('@nestjs/microservices'),
    );
    const moduleRef = await Test.createTestingModule({
      providers: [GRPCHealthIndicator, HealthIndicatorService],
    }).compile();
    grpc = await moduleRef.resolve(GRPCHealthIndicator);
  });

  afterEach(() => grpc.onApplicationShutdown());

  it('should add the serving status when the service is not serving', async () => {
    const result = await grpc.checkService<GrpcOptions>('grpc', 'down', {
      url,
    });
    expect(result).toEqual({
      grpc: {
        status: 'down',
        message: 'serving status: NOT_SERVING',
        statusCode: 2,
        servingStatus: 'NOT_SERVING',
        responseTime: expect.any(Number),
      },
    });
  });

  it('should add the gRPC status code when nothing listens', async () => {
    const result = await grpc.checkService<GrpcOptions>('grpc', 'ok', {
      url: '127.0.0.1:1',
    });
    expect(result.grpc).toMatchObject({
      status: 'down',
      code: grpcJs.status.UNAVAILABLE,
    });
  });
});

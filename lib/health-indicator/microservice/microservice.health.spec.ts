import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { MicroserviceHealthIndicator } from './microservice.health.js';
import { loadPackage } from '../../utils/checkPackage.util.js';
import { HealthIndicatorService } from '../health-indicator.service.js';

vi.mock('../../utils/checkPackage.util.js', () => ({
  assertPackages: vi.fn(),
  loadPackage: vi.fn(),
}));

const clientMock = {
  connect: vi.fn(),
  close: vi.fn(),
};

const nestJSMicroservicesMock = {
  Transport,
  ClientProxyFactory: { create: vi.fn((_: any): any => clientMock) },
};

describe('MicroserviceHealthIndicator', () => {
  let microservice: MicroserviceHealthIndicator;
  const options = { transport: Transport.TCP, options: {} } as const;

  beforeEach(async () => {
    vi.mocked(loadPackage).mockResolvedValue(nestJSMicroservicesMock);
    clientMock.connect.mockReset();
    clientMock.close.mockReset();
    nestJSMicroservicesMock.ClientProxyFactory.create.mockClear();

    const moduleRef = await Test.createTestingModule({
      providers: [MicroserviceHealthIndicator, HealthIndicatorService],
    }).compile();
    microservice = await moduleRef.resolve(MicroserviceHealthIndicator);
  });

  it('closes the client after a successful connect', async () => {
    clientMock.connect.mockResolvedValue(undefined);

    const result = await microservice.pingCheck('tcp', options);

    expect(result).toEqual({ tcp: { status: 'up' } });
    expect(clientMock.close).toHaveBeenCalledTimes(1);
  });

  it('closes the client when connect fails', async () => {
    clientMock.connect.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await microservice.pingCheck('tcp', options);

    expect(result).toEqual({
      tcp: { status: 'down', message: 'ECONNREFUSED' },
    });
    expect(clientMock.close).toHaveBeenCalledTimes(1);
  });

  it('falls back to "<key> is not available" when connect rejects with a non-Error', async () => {
    clientMock.connect.mockRejectedValue({
      err: 'connectFailed',
      url: 'amqp://x',
    });

    const result = await microservice.pingCheck('rmq', options);

    expect(result).toEqual({
      rmq: { status: 'down', message: 'rmq is not available' },
    });
  });

  describe('probe defaults', () => {
    const createdOptions = () =>
      nestJSMicroservicesMock.ClientProxyFactory.create.mock.calls[0][0]
        .options;

    it('connects to Kafka in producerOnlyMode', async () => {
      await microservice.pingCheck('kafka', {
        transport: Transport.KAFKA,
        options: { client: { brokers: ['localhost:9092'] } },
      });

      expect(createdOptions()).toEqual({
        producerOnlyMode: true,
        client: { brokers: ['localhost:9092'] },
      });
    });

    it('does not assert a queue for RMQ when none is configured', async () => {
      await microservice.pingCheck('rmq', {
        transport: Transport.RMQ,
        options: { urls: ['amqp://localhost:5672'] },
      });

      expect(createdOptions()).toEqual({
        noAssert: true,
        urls: ['amqp://localhost:5672'],
      });
    });

    it('does not assert a queue for RMQ when queue is undefined', async () => {
      await microservice.pingCheck('rmq', {
        transport: Transport.RMQ,
        options: { urls: ['amqp://localhost:5672'], queue: undefined },
      });

      expect(createdOptions()).toEqual({
        noAssert: true,
        urls: ['amqp://localhost:5672'],
        queue: undefined,
      });
    });

    it('asserts the queue for RMQ when one is configured', async () => {
      await microservice.pingCheck('rmq', {
        transport: Transport.RMQ,
        options: { urls: ['amqp://localhost:5672'], queue: 'health' },
      });

      expect(createdOptions()).toEqual({
        noAssert: false,
        urls: ['amqp://localhost:5672'],
        queue: 'health',
      });
    });

    it('lets the caller override a default', async () => {
      await microservice.pingCheck('rmq', {
        transport: Transport.RMQ,
        options: { urls: ['amqp://localhost:5672'], noAssert: false },
      });

      expect(createdOptions()).toEqual({
        urls: ['amqp://localhost:5672'],
        noAssert: false,
      });
    });

    it('does not mutate the given options', async () => {
      const given = {
        transport: Transport.RMQ,
        options: { urls: ['amqp://localhost:5672'] },
      };
      await microservice.pingCheck('rmq', given);

      expect(given.options).toEqual({ urls: ['amqp://localhost:5672'] });
    });
  });
});

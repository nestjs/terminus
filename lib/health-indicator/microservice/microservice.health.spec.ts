import { Test } from '@nestjs/testing';
import { Transport } from '@nestjs/microservices';
import { MicroserviceHealthIndicator } from './microservice.health';
import { checkPackages } from '../../utils/checkPackage.util';
import { HealthIndicatorService } from '../health-indicator.service';

jest.mock('../../utils/checkPackage.util');

const clientProxyMock = {
  connect: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
};

const clientProxyFactoryMock = {
  create: jest.fn().mockReturnValue(clientProxyMock),
};

const nestJSMicroservicesMock = {
  ClientProxyFactory: clientProxyFactoryMock,
  Transport,
};

describe('MicroserviceHealthIndicator', () => {
  let microservice: MicroserviceHealthIndicator;

  beforeEach(async () => {
    jest.clearAllMocks();
    (checkPackages as jest.Mock).mockImplementation((): any => [
      nestJSMicroservicesMock,
    ]);

    const moduleRef = await Test.createTestingModule({
      providers: [MicroserviceHealthIndicator, HealthIndicatorService],
    }).compile();

    microservice = await moduleRef.resolve(MicroserviceHealthIndicator);
  });

  describe('#pingCheck', () => {
    it('does not assert an RMQ queue when no queue options are provided', async () => {
      await microservice.pingCheck('rmq', {
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
        },
      });

      expect(clientProxyFactoryMock.create).toHaveBeenCalledWith({
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
          noAssert: true,
        },
      });
    });

    it('does not override an explicitly configured RMQ queue', async () => {
      await microservice.pingCheck('rmq', {
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
          queue: 'healthcheck.queue',
        },
      });

      expect(clientProxyFactoryMock.create).toHaveBeenCalledWith({
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
          queue: 'healthcheck.queue',
        },
      });
    });

    it('does not override an explicitly configured RMQ noAssert option', async () => {
      await microservice.pingCheck('rmq', {
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
          noAssert: false,
        },
      });

      expect(clientProxyFactoryMock.create).toHaveBeenCalledWith({
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
          noAssert: false,
        },
      });
    });

    it('does not override explicitly configured RMQ queue options', async () => {
      await microservice.pingCheck('rmq', {
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
          queueOptions: {
            durable: false,
          },
        },
      });

      expect(clientProxyFactoryMock.create).toHaveBeenCalledWith({
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
          queueOptions: {
            durable: false,
          },
        },
      });
    });

    it('does not override explicitly configured RMQ binding options', async () => {
      await microservice.pingCheck('rmq', {
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
          exchange: 'healthcheck.exchange',
          routingKey: 'healthcheck.route',
        },
      });

      expect(clientProxyFactoryMock.create).toHaveBeenCalledWith({
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
          exchange: 'healthcheck.exchange',
          routingKey: 'healthcheck.route',
        },
      });
    });

    it('keeps Kafka producerOnlyMode defaults unchanged', async () => {
      await microservice.pingCheck('kafka', {
        transport: Transport.KAFKA,
        options: {
          client: {
            brokers: ['localhost:9092'],
          },
        },
      });

      expect(clientProxyFactoryMock.create).toHaveBeenCalledWith({
        transport: Transport.KAFKA,
        options: {
          producerOnlyMode: true,
          client: {
            brokers: ['localhost:9092'],
          },
        },
      });
    });
  });
});

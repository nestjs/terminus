import { type Mock } from 'vitest';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { MicroserviceHealthIndicator } from './microservice.health';
import { checkPackages } from '../../utils/checkPackage.util';
import { HealthIndicatorService } from '../health-indicator.service';

vi.mock('../../utils/checkPackage.util');

const clientMock = {
  connect: vi.fn(),
  close: vi.fn(),
};

const nestJSMicroservicesMock = {
  Transport,
  ClientProxyFactory: { create: vi.fn((): any => clientMock) },
};

describe('MicroserviceHealthIndicator', () => {
  let microservice: MicroserviceHealthIndicator;
  const options = { transport: Transport.TCP, options: {} } as const;

  beforeEach(async () => {
    (checkPackages as Mock).mockImplementation((): any => [
      nestJSMicroservicesMock,
    ]);
    clientMock.connect.mockReset();
    clientMock.close.mockReset();

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
});

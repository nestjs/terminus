import { Test } from '@nestjs/testing';
import { DogHealthIndicator } from './dog.health';
import { DogService } from './dog.service';
import { HealthIndicatorService } from '@nestjs/terminus';
import { DogState } from './interfaces/dog.interface';

///////////////////////////////////////////////////////////

const dogServiceMock = {
  getDogs: jest.fn(),
};

const healthIndicatorSessionMock = {
  up: jest.fn(),
  down: jest.fn(),
};

const healthIndicatorServiceMock = {
  check: jest.fn().mockImplementation(() => healthIndicatorSessionMock),
};

///////////////////////////////////////////////////////////

describe('DogHealthIndicator', () => {
  let dogHealthIndicator: DogHealthIndicator;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DogHealthIndicator,
        {
          provide: DogService,
          useValue: dogServiceMock,
        },
        {
          provide: HealthIndicatorService,
          useValue: healthIndicatorServiceMock,
        },
      ],
    }).compile();

    dogHealthIndicator = await moduleRef.resolve(DogHealthIndicator);
  });

  it('marks the indicator as down if there are badboys', async () => {
    // Arrange
    dogServiceMock.getDogs.mockResolvedValue([
      { name: 'Felix', state: DogState.BAD_BOY },
    ]);

    // Act
    await dogHealthIndicator.isHealthy('dog');

    // Assert
    expect(healthIndicatorSessionMock.down).toHaveBeenCalledWith({
      badboys: 1,
    });
  });

  it('marks the indicator as up if there are no badboys', async () => {
    // Arrange
    dogServiceMock.getDogs.mockResolvedValue([
      { name: 'Felix', state: DogState.GOOD_BOY },
    ]);

    // Act
    await dogHealthIndicator.isHealthy('dog');

    // Assert
    expect(healthIndicatorSessionMock.up).toHaveBeenCalled();
  });
});

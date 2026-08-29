import { Test } from '@nestjs/testing';
import { HealthIndicatorService } from '@nestjs/terminus';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DogHealthIndicator } from './dog.health';
import { DogService } from './dog.service';
import { DogState } from './interfaces/dog.interface';

///////////////////////////////////////////////////////////

const dogServiceMock = {
  getDogs: vi.fn(),
};

const healthIndicatorSessionMock = {
  up: vi.fn(),
  down: vi.fn(),
};

const healthIndicatorServiceMock = {
  check: vi.fn().mockImplementation(() => healthIndicatorSessionMock),
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

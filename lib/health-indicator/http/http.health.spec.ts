import { Test } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { HttpHealthIndicator } from './http.health';
import { checkPackages } from '../../utils/checkPackage.util';
import { of } from 'rxjs';
jest.mock('../../utils/checkPackage.util');

// == MOCKS ==
const httpServiceMock = {
  request: jest.fn(),
};

const nestJSAxiosMock = {
  HttpService: httpServiceMock,
};

describe('Http Response Health Indicator', () => {
  let httpHealthIndicator: HttpHealthIndicator;
  let httpService: HttpService;

  beforeEach(async () => {
    (checkPackages as jest.Mock).mockImplementation((): any => [
      nestJSAxiosMock,
    ]);
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        HttpHealthIndicator,
        {
          provide: nestJSAxiosMock.HttpService as any,
          useValue: httpServiceMock,
        },
      ],
    }).compile();

    httpHealthIndicator = await moduleRef.resolve<HttpHealthIndicator>(
      HttpHealthIndicator,
    );

    httpService = await moduleRef.resolve<HttpService>(
      nestJSAxiosMock.HttpService as any,
    );
  });

  describe('#pingCheck', () => {
    it('should call the NestJS axios http client', async () => {
      httpServiceMock.request.mockReturnValue(of([]));
      await httpHealthIndicator.pingCheck('key', 'url');
      expect(httpServiceMock.request).toHaveBeenCalledWith({ url: 'url' });
    });
    it('should make use of a custom httpClient', async () => {
      const httpClient = {
        request: jest.fn().mockReturnValue(of([])),
      } as any as HttpService;
      await httpHealthIndicator.pingCheck('key', 'url', {
        httpClient,
      });
      expect(httpServiceMock.request).toHaveBeenCalledWith({ url: 'url' });
    });
  });

  describe('#responseCheck', () => {
    it('should be a healthy response check if the statusText is "Yes"', async () => {
      httpServiceMock.request.mockReturnValue(of({ statusText: 'Yes' }));
      await httpHealthIndicator.responseCheck(
        'key',
        'url',
        (res) => res.statusText === 'Yes',
      );
      expect(httpServiceMock.request).toHaveBeenCalledWith({ url: 'url' });
    });

    it('should be a unhealthy response check if the statusText is "Yes"', async () => {
      httpServiceMock.request.mockReturnValue(of({ statusText: 'Yes' }));
      try {
        await httpHealthIndicator.responseCheck(
          'key',
          'url',
          (res) => res.statusText === 'No',
        );
      } catch (err) {
        expect(err).toBeDefined();
        expect((err as any).constructor.name).toEqual('HealthCheckError');
      }

      expect(httpServiceMock.request).toHaveBeenCalledWith({ url: 'url' });
    });
  });
});

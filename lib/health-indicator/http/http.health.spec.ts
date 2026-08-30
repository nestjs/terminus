import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { HttpHealthIndicator } from './http.health.js';
import { loadPackage } from '../../utils/checkPackage.util.js';
import { of } from 'rxjs';
import { TERMINUS_LOGGER } from '../../terminus.constants.js';
import { AxiosError } from 'axios';
import { HealthIndicatorService } from '../health-indicator.service.js';
vi.mock('../../utils/checkPackage.util.js', () => ({
  assertPackages: vi.fn(),
  loadPackage: vi.fn(),
}));

// == MOCKS ==
const httpServiceMock = {
  request: vi.fn(),
};

const nestJSAxiosMock = {
  HttpService: vi.fn(function () {
    return httpServiceMock;
  }),
};

describe('Http Response Health Indicator', () => {
  let httpHealthIndicator: HttpHealthIndicator;

  beforeEach(async () => {
    vi.mocked(loadPackage).mockResolvedValue(nestJSAxiosMock);
  });

  beforeEach(async () => {
    httpServiceMock.request.mockReset();
    nestJSAxiosMock.HttpService.mockClear();
    const moduleRef = await Test.createTestingModule({
      providers: [
        HttpHealthIndicator,
        HealthIndicatorService,
        {
          provide: TERMINUS_LOGGER,
          useValue: {
            error: vi.fn(),
            setContext: vi.fn(),
          },
        },
      ],
    }).compile();

    httpHealthIndicator =
      await moduleRef.resolve<HttpHealthIndicator>(HttpHealthIndicator);
  });

  describe('#pingCheck', () => {
    it('should call the NestJS axios http client', async () => {
      httpServiceMock.request.mockReturnValue(of([]));
      await httpHealthIndicator.pingCheck('key', 'url');
      expect(httpServiceMock.request).toHaveBeenCalledWith({ url: 'url' });
    });

    it('should create an unconfigured HttpService instead of resolving one from the app', async () => {
      httpServiceMock.request.mockReturnValue(of([]));
      await httpHealthIndicator.pingCheck('key', 'url');
      expect(nestJSAxiosMock.HttpService).toHaveBeenCalledWith();
    });

    it('should make use of a custom httpClient', async () => {
      const httpClient = {
        request: vi.fn().mockReturnValue(of([])),
      } as any as HttpService;
      await httpHealthIndicator.pingCheck('key', 'url', {
        httpClient,
      });
      expect(httpClient.request).toHaveBeenCalledWith({ url: 'url' });
      expect(nestJSAxiosMock.HttpService).not.toHaveBeenCalled();
    });

    it('should throw an error if the response is not an axios error', async () => {
      httpServiceMock.request.mockImplementation(() => {
        throw new Error('Error');
      });
      try {
        await httpHealthIndicator.pingCheck('key', 'url');
      } catch (err) {
        expect(err).toBeDefined();
        expect((err as any).constructor.name).toEqual('Error');
      }

      expect(httpServiceMock.request).toHaveBeenCalledWith({ url: 'url' });
    });

    it('should throw a HealthCheckError if there is no response', async () => {
      httpServiceMock.request.mockImplementation(() => {
        throw new AxiosError('Error');
      });
      await httpHealthIndicator.pingCheck('key', 'url');

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

    it('should throw an error if the response is not an axios error', async () => {
      httpServiceMock.request.mockImplementation(() => {
        throw new Error('Error');
      });
      try {
        await httpHealthIndicator.responseCheck(
          'key',
          'url',
          (res) => res.statusText === 'No',
        );
      } catch (err) {
        expect(err).toBeDefined();
        expect((err as any).constructor.name).toEqual('Error');
      }

      expect(httpServiceMock.request).toHaveBeenCalledWith({ url: 'url' });
    });

    it('should throw a HealthCheckError if there is no response', async () => {
      httpServiceMock.request.mockImplementation(() => {
        throw new AxiosError('Error');
      });
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

    it('should throw a HealthCheckError if there is a response but does not match the condition', async () => {
      httpServiceMock.request.mockImplementation(() => {
        throw new AxiosError<any>('Error', undefined, undefined, undefined, {
          data: '',
          status: 200,
          headers: {},
          config: {} as any,
          statusText: 'Yes',
        });
      });
      try {
        await httpHealthIndicator.responseCheck(
          'key',
          'url',
          (res) => res.statusText === 'No',
        );
      } catch (err) {
        expect(err).toBeDefined();
      }

      expect(httpServiceMock.request).toHaveBeenCalledWith({ url: 'url' });
    });

    it('should be healthy if the response is status code 500 and the condition says that the status code needs to be 500', async () => {
      httpServiceMock.request.mockImplementation(() => {
        throw new AxiosError<any>('Error', undefined, undefined, undefined, {
          data: '',
          status: 500,
          headers: {},
          config: {} as any,
          statusText: 'Yes',
        });
      });
      await httpHealthIndicator.responseCheck(
        'key',
        'url',
        (res) => res.status === 500,
      );

      expect(httpServiceMock.request).toHaveBeenCalledWith({ url: 'url' });
    });
  });
});

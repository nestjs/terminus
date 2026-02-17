import { Test } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { HttpHealthIndicator } from './http.health';
import { checkPackages } from '../../utils/checkPackage.util';
import { of } from 'rxjs';
import { TERMINUS_LOGGER } from '../../terminus.constants';
import { AxiosError } from 'axios';
import { HealthCheckError } from 'lib/health-check';
import { HealthIndicatorService } from '../health-indicator.service';
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
        HealthIndicatorService,
        {
          provide: nestJSAxiosMock.HttpService as any,
          useValue: httpServiceMock,
        },
        {
          provide: TERMINUS_LOGGER,
          useValue: {
            error: jest.fn(),
            setContext: jest.fn(),
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
    it('should make use of a custom httpClient', async () => {
      const httpClient = {
        request: jest.fn().mockReturnValue(of([])),
      } as any as HttpService;
      await httpHealthIndicator.pingCheck('key', 'url', {
        httpClient,
      });
      expect(httpServiceMock.request).toHaveBeenCalledWith({ url: 'url' });
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
      try {
        await httpHealthIndicator.pingCheck('key', 'url');
      } catch (err) {
        expect(err).toBeDefined();
        expect((err as any).constructor.name).toEqual('HealthCheckError');
        expect((err as HealthCheckError).causes).toEqual({
          key: { message: 'Error', status: 'down' },
        });
      }

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
        expect((err as HealthCheckError).constructor.name).toEqual(
          'HealthCheckError',
        );
        expect((err as HealthCheckError).causes).toEqual({
          key: {
            message: 'Error',
            status: 'down',
            statusCode: 200,
            statusText: 'Yes',
          },
        });
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

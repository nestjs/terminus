import { Test } from '@nestjs/testing';
import { HealthCheckError } from '../../health-check/health-check.error';
import { HttpService } from '@nestjs/axios';
import { EMPTY, of, throwError } from 'rxjs';
import { AxiosResponse, AxiosRequestConfig, AxiosError } from 'axios';
import { HttpHealthIndicator } from './http.health';

describe('Http Response Health Indicator', () => {
  let httpHealthIndicator: HttpHealthIndicator;
  let httpService: HttpService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HttpHealthIndicator,
        {
          provide: HttpService,
          useFactory: () => ({
            request: jest.fn(),
          }),
        },
      ],
    }).compile();

    httpHealthIndicator = await moduleRef.resolve<HttpHealthIndicator>(
      HttpHealthIndicator,
    );
    httpService = moduleRef.get<HttpService>(HttpService);
  });

  describe('#pingCheck', () => {
    it('should make use of a custom httpClient', async () => {
      const httpServiceMock = ({
        request: jest.fn().mockReturnValue(EMPTY),
      } as any) as HttpService;
      await httpHealthIndicator.pingCheck('key', 'url', {
        httpClient: httpServiceMock,
      });

      expect(httpServiceMock.request).toHaveBeenCalledWith({ url: 'url' });
    });
  });

  describe('#responseCheck', () => {
    describe('success conditions', () => {
      describe('async callback', () => {
        it("async callback returning true should return key with status='up'", async () => {
          const key = 'key value';
          const url = 'url value';

          interface IHttpResponse {
            a: number;
            b: string;
            c: boolean;
          }

          const mockResponse = {
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
            data: {
              a: 17,
              b: 'some string value',
              c: true,
            },
          };

          const httpServiceRequestSpy = jest
            .spyOn(httpService, 'request')
            .mockImplementation(() => of(mockResponse));

          const f = async (response: AxiosResponse<IHttpResponse>) => {
            expect(response).toStrictEqual(mockResponse);

            return true;
          };

          const indicatorResponse = await httpHealthIndicator.responseCheck(
            key,
            url,
            f,
          );

          expect(indicatorResponse).toStrictEqual({
            [key]: {
              status: 'up',
            },
          });

          expect(httpServiceRequestSpy).toHaveBeenCalledWith({
            url,
          });
        });

        it("async callback returning false should return key with status='down'", async () => {
          const key = 'key value';
          const url = 'url value';

          interface IHttpResponse {
            a: number;
            b: string;
            c: boolean;
          }

          const mockResponse = {
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
            data: {
              a: 17,
              b: 'some string value',
              c: true,
            },
          };

          const httpServiceRequestSpy = jest
            .spyOn(httpService, 'request')
            .mockImplementation(() => of(mockResponse));

          const callback = async (response: AxiosResponse<IHttpResponse>) => {
            expect(response).toStrictEqual(mockResponse);

            return false;
          };

          try {
            await httpHealthIndicator.responseCheck(key, url, callback);
            fail('a HealthCheckError should have been thrown');
          } catch (err) {
            expect(err instanceof HealthCheckError).toBeTruthy();
            expect(err.message).toEqual(`${key} is not available`);
            expect(err.causes).toStrictEqual({
              'key value': {
                status: 'down',
              },
            });
          }
        });
      });

      describe('non-async callback', () => {
        it("callback returning true should return key with status='up'", async () => {
          const key = 'key value';
          const url = 'url value';

          interface IHttpResponse {
            a: number;
            b: string;
            c: boolean;
          }

          const mockResponse = {
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
            data: {
              a: 17,
              b: 'some string value',
              c: true,
            },
          };

          const httpServiceRequestSpy = jest
            .spyOn(httpService, 'request')
            .mockImplementation(() => of(mockResponse));

          const callback = (response: AxiosResponse<IHttpResponse>) => {
            expect(response).toStrictEqual(mockResponse);

            return true;
          };

          const indicatorResponse = await httpHealthIndicator.responseCheck(
            key,
            url,
            callback,
          );

          expect(indicatorResponse).toStrictEqual({
            [key]: {
              status: 'up',
            },
          });

          expect(httpServiceRequestSpy).toHaveBeenCalledWith({
            url,
          });
        });

        it("callback returning false should return key with status='down'", async () => {
          const key = 'key value';
          const url = 'url value';

          interface IHttpResponse {
            a: number;
            b: string;
            c: boolean;
          }

          const mockResponse = {
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
            data: {
              a: 17,
              b: 'some string value',
              c: true,
            },
          };

          const httpServiceRequestSpy = jest
            .spyOn(httpService, 'request')
            .mockImplementation(() => of(mockResponse));

          const callback = (response: AxiosResponse<IHttpResponse>) => {
            expect(response).toStrictEqual(mockResponse);

            return false;
          };

          try {
            await httpHealthIndicator.responseCheck(key, url, callback);
            fail('a HealthCheckError should have been thrown');
          } catch (err) {
            expect(err instanceof HealthCheckError).toBeTruthy();
            expect(err.message).toEqual(`${key} is not available`);
            expect(err.causes).toStrictEqual({
              'key value': {
                status: 'down',
              },
            });
          }

          expect(httpServiceRequestSpy).toHaveBeenCalledWith({
            url,
          });
        });
      });

      it('url being supplied as URL instance should be accepted', async () => {
        const key = 'key value';
        const url = new URL('http://127.0.0.1');

        interface IHttpResponse {
          a: number;
          b: string;
          c: boolean;
        }

        const mockResponse = {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
          data: {
            a: 17,
            b: 'some string value',
            c: true,
          },
        };

        const httpServiceRequestSpy = jest
          .spyOn(httpService, 'request')
          .mockImplementation(() => of(mockResponse));

        const callback = (response: AxiosResponse<IHttpResponse>) => {
          expect(response).toStrictEqual(mockResponse);

          return true;
        };

        const indicatorResponse = await httpHealthIndicator.responseCheck(
          key,
          url,
          callback,
        );

        expect(indicatorResponse).toStrictEqual({
          [key]: {
            status: 'up',
          },
        });

        expect(httpServiceRequestSpy).toHaveBeenCalledWith({
          url: url.toString(),
        });
      });

      it('additional options should be passed to httpService.request', async () => {
        const key = 'key value';
        const url = 'url value';

        interface IHttpResponse {
          a: number;
          b: string;
          c: boolean;
        }

        const mockResponse = {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
          data: {
            a: 17,
            b: 'some string value',
            c: true,
          },
        };

        const httpServiceRequestSpy = jest
          .spyOn(httpService, 'request')
          .mockImplementation(() => of(mockResponse));

        const callback = (response: AxiosResponse<IHttpResponse>) => {
          expect(response).toStrictEqual(mockResponse);

          return true;
        };

        const options: AxiosRequestConfig = {
          maxRedirects: 3,
          auth: {
            username: 'username value',
            password: 'password value',
          },
        };

        const indicatorResponse = await httpHealthIndicator.responseCheck(
          key,
          url,
          callback,
          options,
        );

        expect(indicatorResponse).toStrictEqual({
          [key]: {
            status: 'up',
          },
        });

        expect(httpServiceRequestSpy).toHaveBeenCalledWith({
          url,
          ...options,
        });
      });
    });

    describe('error conditions', () => {
      it('request throwing AxiosError should throw error with message and statusCode/statusText from response', async () => {
        const key = 'key value';
        const url = 'url value';

        interface IHttpResponse {
          a: number;
          b: string;
          c: boolean;
        }

        const mockResponse = {
          status: 500,
          statusText: 'status text value',
          headers: {},
          config: {},
          data: {
            a: 17,
            b: 'some string value',
            c: true,
          },
        };

        jest.spyOn(httpService, 'request').mockImplementation(() => {
          return throwError({
            name: 'error name value',
            message: 'axios.request threw an error for some reason',
            config: {},
            code: 'status code value',
            request: {},
            response: mockResponse,
            isAxiosError: true,
            toJSON: () => ({}),
          } as AxiosError<IHttpResponse>);
        });

        const callback = fail.bind(
          null,
          'callback should not have been called',
        );

        try {
          await httpHealthIndicator.responseCheck(key, url, callback);
        } catch (err) {
          expect(err instanceof HealthCheckError).toBeTruthy();
          expect(err.message).toEqual(
            'axios.request threw an error for some reason',
          );
          expect(err.causes).toStrictEqual({
            'key value': {
              status: 'down',
              message: 'axios.request threw an error for some reason',
              statusCode: 500,
              statusText: 'status text value',
            },
          });
        }
      });

      it('request throwing AxiosError w/o response should only include message', async () => {
        const key = 'key value';
        const url = 'url value';

        interface IHttpResponse {}

        jest.spyOn(httpService, 'request').mockImplementation(() => {
          return throwError({
            name: 'error name value',
            message: 'axios.request threw an error for some reason',
            config: {},
            code: 'status code value',
            request: {},
            response: undefined,
            isAxiosError: true,
            toJSON: () => ({}),
          } as AxiosError<IHttpResponse>);
        });

        const callback = fail.bind(
          null,
          'callback should not have been called',
        );

        try {
          await httpHealthIndicator.responseCheck(key, url, callback);
        } catch (err) {
          expect(err instanceof HealthCheckError).toBeTruthy();
          expect(err.message).toEqual(
            'axios.request threw an error for some reason',
          );
          expect(err.causes).toStrictEqual({
            'key value': {
              status: 'down',
              message: 'axios.request threw an error for some reason',
            },
          });
        }
      });

      it('callback throwing error should rethrow it wrapped in a HealthCheckError', async () => {
        const key = 'key value';
        const url = 'url value';

        interface OtherError extends Error {
          property1?: string;
          property2?: string;
        }

        interface IHttpResponse {
          a: number;
          b: string;
          c: boolean;
        }

        const mockResponse = {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
          data: {
            a: 17,
            b: 'some string value',
            c: true,
          },
        };

        jest
          .spyOn(httpService, 'request')
          .mockImplementation(() => of(mockResponse));

        const callback = (response: AxiosResponse<IHttpResponse>) => {
          throw {
            message: 'callback threw an error for some reason',
            property1: 'property1 value',
            property2: 'property2 value',
          } as OtherError;
        };

        try {
          await httpHealthIndicator.responseCheck(key, url, callback);
        } catch (err) {
          expect(err instanceof HealthCheckError).toBeTruthy();
          expect(err.message).toEqual(
            'callback threw an error for some reason',
          );
          expect(err.causes).toStrictEqual({
            'key value': {
              status: 'down',
            },
          });
        }
      });
    });
  });
});

import { Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { HttpHealthIndicator } from './http.health';
import { TerminusModule } from '../../terminus.module';

// https://github.com/nestjs/terminus/issues/2667
//
// A health check must never silently pick up an HttpService instance a
// completely unrelated module configured for its own purposes (wrong
// baseURL, headers, interceptors, etc). This uses the *real* @nestjs/axios
// module (unlike http.health.spec.ts, which mocks it) so that the actual
// NestJS DI graph is exercised, not a mock of it.

const CUSTOM_HTTP_CLIENT_TOKEN = Symbol('CUSTOM_HTTP_CLIENT_TOKEN');

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => ({ baseURL: 'https://cats.com' }),
    }),
  ],
  providers: [{ provide: CUSTOM_HTTP_CLIENT_TOKEN, useExisting: HttpService }],
  exports: [CUSTOM_HTTP_CLIENT_TOKEN],
})
class UnrelatedApiModule {}

@Injectable()
class HealthCheckedService {
  constructor(public readonly http: HttpHealthIndicator) {}
}

@Module({
  imports: [TerminusModule],
  providers: [HealthCheckedService],
})
class HealthCheckedModule {}

@Module({ imports: [UnrelatedApiModule] })
class SomeUnrelatedFeatureModule {}

describe('HttpHealthIndicator (integration, real @nestjs/axios)', () => {
  it('does not use an HttpService configured by an unrelated module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SomeUnrelatedFeatureModule, HealthCheckedModule],
    }).compile();

    const service = await moduleRef.resolve(HealthCheckedService);
    const httpService = (service.http as any).getHttpService();

    expect(httpService.axiosRef.defaults.baseURL).toBeUndefined();
  });

  it('still lets a preconfigured HttpService be used when explicitly passed as httpClient', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SomeUnrelatedFeatureModule, HealthCheckedModule],
    }).compile();

    const service = await moduleRef.resolve(HealthCheckedService);
    const configuredHttpService = moduleRef.get<HttpService>(
      CUSTOM_HTTP_CLIENT_TOKEN,
      { strict: false },
    );

    // pingCheck's `httpClient ||` fallback is what #1151 relies on for reuse
    // of a preconfigured client - it must remain unaffected by this fix.
    const requestSpy = jest
      .spyOn(configuredHttpService, 'request')
      .mockReturnValue(of({}) as any);

    await service.http.pingCheck('cats', '/some-path', {
      httpClient: configuredHttpService,
    });

    expect(requestSpy).toHaveBeenCalled();
  });
});

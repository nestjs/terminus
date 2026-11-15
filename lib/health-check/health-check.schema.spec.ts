import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { HealthCheck } from './health-check.decorator.js';

@Controller('health')
class TestController {
  @Get()
  @HealthCheck()
  check() {
    return { status: 'ok', info: {}, error: {}, details: {} };
  }
}

@Controller('ready')
class SecondController {
  @Get()
  @HealthCheck()
  check() {
    return { status: 'ok', info: {}, error: {}, details: {} };
  }
}

@Module({ controllers: [TestController, SecondController] })
class TestModule {}

describe('HealthCheck swagger schema', () => {
  let document: OpenAPIObject;

  beforeAll(async () => {
    const app = await NestFactory.create(TestModule, { logger: false });
    document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    await app.close();
  });

  /** The schema of a response of `GET <path>`, as a plain object */
  const responseSchema = (path: string, status: '200' | '503'): any =>
    (document.paths[path]?.get?.responses as any)?.[status]?.content?.[
      'application/json'
    ]?.schema;

  it('registers the result and the indicator result as named schemas', () => {
    expect(Object.keys(document.components?.schemas ?? {})).toEqual(
      expect.arrayContaining([
        'TerminusHealthCheckResult',
        'TerminusHealthIndicatorResult',
      ]),
    );
  });

  it.each(['/health', '/ready'])(
    'references the named schema from the 200 and 503 response of %s',
    (path) => {
      for (const status of ['200', '503'] as const) {
        expect(responseSchema(path, status).allOf).toEqual([
          { $ref: '#/components/schemas/TerminusHealthCheckResult' },
        ]);
      }
    },
  );

  it('keeps the ok/error status enums distinct per response', () => {
    expect(responseSchema('/health', '200').properties.status.enum).toEqual([
      'ok',
      'degraded',
    ]);
    expect(responseSchema('/health', '503').properties.status.enum).toEqual([
      'error',
      'shutting_down',
    ]);
  });

  // An indicator can add its own data to its result (#2516)
  it('allows additional properties on an indicator result', () => {
    const result: any = document.components?.schemas?.TerminusHealthCheckResult;

    expect(result.properties.details.additionalProperties).toEqual({
      allOf: [
        { $ref: '#/components/schemas/TerminusHealthIndicatorResult' },
        { type: 'object', additionalProperties: true },
      ],
    });
  });
});

import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HealthCheck } from './health-check.decorator.js';

@Controller('health')
class TestController {
  @Get()
  @HealthCheck()
  check() {
    return { status: 'ok', info: {}, error: {}, details: {} };
  }
}

@Module({ controllers: [TestController] })
class TestModule {}

describe('HealthCheck swagger schema', () => {
  it('registers HealthCheckResultDto and HealthIndicatorEntryDto as named, reusable schemas', async () => {
    const app = await NestFactory.create(TestModule, { logger: false });
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    await app.close();

    expect(document.components?.schemas).toHaveProperty('HealthCheckResultDto');
    expect(document.components?.schemas).toHaveProperty(
      'HealthIndicatorEntryDto',
    );
  });

  it('references the named schema from both the 200 and 503 responses instead of inlining it', async () => {
    const app = await NestFactory.create(TestModule, { logger: false });
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    await app.close();

    const responses = document.paths['/health']?.get?.responses;
    const okSchema = responses?.['200']?.content?.['application/json']?.schema;
    const errorSchema =
      responses?.['503']?.content?.['application/json']?.schema;

    expect(JSON.stringify(okSchema)).toContain(
      '#/components/schemas/HealthCheckResultDto',
    );
    expect(JSON.stringify(errorSchema)).toContain(
      '#/components/schemas/HealthCheckResultDto',
    );
  });

  it('keeps the ok/error status enums distinct per response', async () => {
    const app = await NestFactory.create(TestModule, { logger: false });
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    await app.close();

    const responses = document.paths['/health']?.get?.responses;
    const okSchema = responses?.['200']?.content?.['application/json']
      ?.schema as { properties?: { status?: { enum?: string[] } } };
    const errorSchema = responses?.['503']?.content?.['application/json']
      ?.schema as { properties?: { status?: { enum?: string[] } } };

    expect(okSchema.properties?.status?.enum).toEqual(['ok', 'degraded']);
    expect(errorSchema.properties?.status?.enum).toEqual([
      'error',
      'shutting_down',
    ]);
  });
});

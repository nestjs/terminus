import { createRequire } from 'node:module';
import { Header } from '@nestjs/common';
import { HealthCheckStatus } from './health-check-result.interface.js';
import {
  getHealthCheckExtraModels,
  getHealthCheckSchema,
} from './health-check.schema.js';

type Swagger = typeof import('@nestjs/swagger');

/**
 * @publicApi
 */
export interface HealthCheckOptions {
  /**
   * Whether to cache the response or not.
   * - If set to `true`, the response header will be set to `Cache-Control: no-cache, no-store, must-revalidate`.
   * - If set to `false`, no header will be set and can be set manually with e.g. `@Header('Cache-Control', 'max-age=604800')`.
   *
   * @default true
   */
  noCache?: boolean;
  /**
   * Whether to document the endpoint with Swagger or not.
   *
   * @default true
   */
  swaggerDocumentation?: boolean;
}

/**
 * Marks the endpoint as a Health Check endpoint.
 *
 * - If the `@nestjs/swagger` package is installed, the endpoint will be documented.
 * - Per default, the response will not be cached.
 *
 * @publicApi
 */
export const HealthCheck = ({
  noCache = true,
  swaggerDocumentation = true,
}: HealthCheckOptions = {}) => {
  const decorators: MethodDecorator[] = [];

  if (swaggerDocumentation) {
    let swagger: Swagger | null = null;
    try {
      // Inside the `try`, because `import.meta.url` is not set in a CommonJS
      // bundle (e.g. esbuild), where `createRequire` then throws
      const require = createRequire(import.meta.url);
      swagger = require('@nestjs/swagger');
    } catch {}

    if (swagger) {
      decorators.push(...getSwaggerDefinitions(swagger));
    }
  }

  if (noCache) {
    const CacheControl = Header(
      'Cache-Control',
      'no-cache, no-store, must-revalidate',
    );

    decorators.push(CacheControl);
  }

  return (target: any, key: any, descriptor: PropertyDescriptor) => {
    decorators.forEach((decorator) => {
      decorator(target, key, descriptor);
    });
  };
};

function getSwaggerDefinitions(swagger: Swagger) {
  const { ApiExtraModels, ApiOkResponse, ApiServiceUnavailableResponse } =
    swagger;

  const ExtraModels = ApiExtraModels(...getHealthCheckExtraModels(swagger));

  const ServiceUnavailable = ApiServiceUnavailableResponse({
    description: 'The Health Check is not successful',
    schema: getHealthCheckSchema(swagger, HealthCheckStatus.ERROR),
  });

  const Ok = ApiOkResponse({
    description: 'The Health Check is successful',
    schema: getHealthCheckSchema(swagger, HealthCheckStatus.OK),
  });

  return [ExtraModels, ServiceUnavailable, Ok];
}

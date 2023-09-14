import { Header } from '@nestjs/common';
import { getHealthCheckSchema } from './health-check.schema';

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
export const HealthCheck = (
  { noCache, swaggerDocumentation }: HealthCheckOptions = {
    noCache: true,
    swaggerDocumentation: true,
  },
) => {
  const decorators: MethodDecorator[] = [];

  if (swaggerDocumentation) {
    let swagger: Swagger | null = null;
    try {
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
  const { ApiOkResponse, ApiServiceUnavailableResponse } = swagger;

  const ServiceUnavailable = ApiServiceUnavailableResponse({
    description: 'The Health Check is not successful',
    schema: getHealthCheckSchema('error'),
  });

  const Ok = ApiOkResponse({
    description: 'The Health Check is successful',
    schema: getHealthCheckSchema('ok'),
  });

  return [ServiceUnavailable, Ok];
}

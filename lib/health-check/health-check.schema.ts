import { type HealthCheckStatus } from './health-check-result.interface.js';
import {
  type HealthIndicatorResult,
  type HealthIndicatorStatus,
} from '../health-indicator/index.js';

/**
 * The parts of `@nestjs/swagger` used in this file.
 *
 * Declared here and not taken from `@nestjs/swagger`, because the functions
 * below are exported: their types end up in the type definitions of Terminus,
 * which must not import an optional peer dependency.
 */
interface Swagger {
  ApiProperty: (options?: any) => PropertyDecorator;
  ApiPropertyOptional: (options?: any) => PropertyDecorator;
  getSchemaPath: (model: new () => unknown) => string;
}

// A schema fragment we build by hand (as opposed to deriving it from a
// decorated DTO class), so its shape doesn't need to satisfy `@nestjs/swagger`'s
// `ApiPropertyOptions` overloads.
type RawSchema = Record<string, unknown>;

// These examples will be displayed on Swagger
const DB_EXAMPLE: HealthIndicatorResult = {
  database: { status: 'up', responseTime: 12 },
};
const REDIS_EXAMPLE: HealthIndicatorResult = {
  redis: { status: 'down', message: 'Could not connect', responseTime: 3005 },
};
const COMBINED_EXAMPLE: HealthIndicatorResult = {
  ...DB_EXAMPLE,
  ...REDIS_EXAMPLE,
};

// The class names are the schema names in the OpenAPI document. They have a
// `Terminus` prefix, because a class of the app with the same name would
// replace the schema without any warning.
interface HealthCheckDtoClasses {
  TerminusHealthIndicatorResult: new () => unknown;
  TerminusHealthCheckResult: new () => unknown;
}

// Built once per process (lazily, on first use) so `@nestjs/swagger` always
// sees the same class references for these models. Building a fresh class
// per `@HealthCheck()` usage would give the swagger module several distinct
// classes that happen to share a name, which it cannot tell apart from
// genuinely different models with a name collision.
let dtoClasses: HealthCheckDtoClasses | undefined;

function getHealthCheckDtoClasses(swagger: Swagger): HealthCheckDtoClasses {
  if (dtoClasses) {
    return dtoClasses;
  }

  const { ApiProperty, ApiPropertyOptional } = swagger;

  class TerminusHealthIndicatorResult {
    @ApiProperty({
      enum: ['up', 'degraded', 'down'] satisfies HealthIndicatorStatus[],
      description: 'The status of this health indicator',
    })
    status!: HealthIndicatorStatus;

    @ApiPropertyOptional({
      description: 'Time the health indicator took to respond, in ms',
    })
    responseTime?: number;

    @ApiPropertyOptional({
      description: 'Set by health indicators that report extra context',
    })
    message?: string;
  }

  // Each indicator can attach arbitrary custom data beyond `status` /
  // `responseTime` / `message` (see `HealthIndicatorResult`'s `OptionalData`
  // generic), so the per-entry schema keeps `additionalProperties: true`
  // alongside the documented fields above.
  const indicatorEntrySchema: RawSchema = {
    allOf: [{ $ref: swagger.getSchemaPath(TerminusHealthIndicatorResult) }],
    additionalProperties: true,
  };

  const indicatorMapSchema: RawSchema = {
    type: 'object',
    additionalProperties: indicatorEntrySchema,
  };

  class TerminusHealthCheckResult {
    @ApiProperty({
      enum: [
        'error',
        'ok',
        'degraded',
        'shutting_down',
      ] satisfies HealthCheckStatus[],
      example: 'ok',
    })
    status!: HealthCheckStatus;

    @ApiPropertyOptional({
      ...indicatorMapSchema,
      example: DB_EXAMPLE,
      nullable: true,
    })
    info?: HealthIndicatorResult;

    @ApiPropertyOptional({
      ...indicatorMapSchema,
      example: {},
      nullable: true,
    })
    error?: HealthIndicatorResult;

    @ApiProperty({
      ...indicatorMapSchema,
      example: DB_EXAMPLE,
    })
    details!: HealthIndicatorResult;
  }

  dtoClasses = { TerminusHealthIndicatorResult, TerminusHealthCheckResult };
  return dtoClasses;
}

/**
 * The models that must be registered with `@ApiExtraModels()` for
 * `getHealthCheckSchema()`'s `$ref`s to resolve.
 */
export function getHealthCheckExtraModels(swagger: Swagger) {
  const { TerminusHealthIndicatorResult, TerminusHealthCheckResult } =
    getHealthCheckDtoClasses(swagger);
  return [TerminusHealthIndicatorResult, TerminusHealthCheckResult] as const;
}

export function getHealthCheckSchema(
  swagger: Swagger,
  status: HealthCheckStatus,
): RawSchema {
  const { TerminusHealthCheckResult } = getHealthCheckDtoClasses(swagger);

  return {
    allOf: [{ $ref: swagger.getSchemaPath(TerminusHealthCheckResult) }],
    properties: {
      status: {
        enum:
          status === 'error' ? ['error', 'shutting_down'] : ['ok', 'degraded'],
        example: status,
      },
      error: {
        example: status === 'error' ? REDIS_EXAMPLE : {},
      },
      details: {
        example: status === 'error' ? COMBINED_EXAMPLE : DB_EXAMPLE,
      },
    },
  };
}

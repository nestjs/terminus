import { HealthCheckStatus } from './health-check-result.interface.js';
import {
  type HealthIndicatorResult,
  HealthIndicatorStatus,
} from '../health-indicator/service/health-indicator-result.interface.js';

// The parts of `@nestjs/swagger` used here. Not imported from it: the type
// definitions of Terminus must not import an optional peer.
interface Swagger {
  ApiProperty: (options?: any) => PropertyDecorator;
  ApiPropertyOptional: (options?: any) => PropertyDecorator;
  getSchemaPath: (model: new () => unknown) => string;
}

// These examples will be displayed on Swagger
const DB_EXAMPLE: HealthIndicatorResult = {
  database: { status: HealthIndicatorStatus.UP, responseTime: 12 },
};
const REDIS_EXAMPLE: HealthIndicatorResult = {
  redis: {
    status: HealthIndicatorStatus.DOWN,
    message: 'Could not connect',
    responseTime: 3005,
  },
};
const COMBINED_EXAMPLE: HealthIndicatorResult = {
  ...DB_EXAMPLE,
  ...REDIS_EXAMPLE,
};

// The class names are the schema names in the OpenAPI document. The `Terminus`
// prefix keeps a class of the app with the same name from replacing them.
interface HealthCheckDtoClasses {
  TerminusHealthIndicatorResult: new () => unknown;
  TerminusHealthCheckResult: new () => unknown;
}

// Built once: a new class per `@HealthCheck()` would look like a name
// collision to `@nestjs/swagger`.
let dtoClasses: HealthCheckDtoClasses | undefined;

function getHealthCheckDtoClasses(swagger: Swagger): HealthCheckDtoClasses {
  if (dtoClasses) {
    return dtoClasses;
  }

  const { ApiProperty, ApiPropertyOptional } = swagger;

  class TerminusHealthIndicatorResult {
    @ApiProperty({
      enum: Object.values(HealthIndicatorStatus),
      description: 'The status of this health indicator',
    })
    status!: HealthIndicatorStatus;

    @ApiPropertyOptional({
      description: 'Time the health indicator took to respond, in ms',
    })
    responseTime?: number;

    @ApiPropertyOptional({
      description: 'Whether this result was served from the cache',
    })
    cachedResponse?: boolean;
  }

  // An indicator can add any data. `additionalProperties` is inside `allOf`,
  // because some client generators ignore it next to `allOf`.
  const indicatorEntrySchema: Record<string, unknown> = {
    allOf: [
      { $ref: swagger.getSchemaPath(TerminusHealthIndicatorResult) },
      { type: 'object', additionalProperties: true },
    ],
  };

  const indicatorMapSchema: Record<string, unknown> = {
    type: 'object',
    additionalProperties: indicatorEntrySchema,
  };

  class TerminusHealthCheckResult {
    @ApiProperty({
      enum: Object.values(HealthCheckStatus),
      example: HealthCheckStatus.OK,
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
): Record<string, unknown> {
  const { TerminusHealthCheckResult } = getHealthCheckDtoClasses(swagger);
  const isError = status === HealthCheckStatus.ERROR;

  return {
    allOf: [{ $ref: swagger.getSchemaPath(TerminusHealthCheckResult) }],
    properties: {
      status: {
        enum: isError
          ? [HealthCheckStatus.ERROR, HealthCheckStatus.SHUTTING_DOWN]
          : [HealthCheckStatus.OK, HealthCheckStatus.DEGRADED],
        example: status,
      },
      error: {
        example: isError ? REDIS_EXAMPLE : {},
      },
      details: {
        example: isError ? COMBINED_EXAMPLE : DB_EXAMPLE,
      },
    },
  };
}

import { type HealthCheckStatus } from './health-check-result.interface';
import { type HealthIndicatorResult } from '../health-indicator';
import type {} from '@nestjs/swagger';

// These examples will be displayed on Swagger
const DB_EXAMPLE: HealthIndicatorResult = { database: { status: 'up' } };
const REDIS_EXAMPLE: HealthIndicatorResult = {
  redis: { status: 'down', message: 'Could not connect' },
};
const COMBINED_EXAMPLE: HealthIndicatorResult = {
  ...DB_EXAMPLE,
  ...REDIS_EXAMPLE,
};

const healthIndicatorSchema = (example: HealthIndicatorResult) => ({
  type: 'object',
  example,
  additionalProperties: {
    type: 'object',
    required: ['status'],
    properties: {
      status: {
        type: 'string',
      },
    },
    additionalProperties: {
      type: 'object',
    },
  },
});

export function getHealthCheckSchema(status: HealthCheckStatus) {
  return {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: status,
      },
      info: {
        ...healthIndicatorSchema(DB_EXAMPLE),
        nullable: true,
      },
      error: {
        ...healthIndicatorSchema(status === 'error' ? REDIS_EXAMPLE : {}),
        nullable: true,
      },
      details: healthIndicatorSchema(
        status === 'error' ? COMBINED_EXAMPLE : DB_EXAMPLE,
      ),
    },
  };
}

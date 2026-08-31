import { type HealthCheckStatus } from './health-check-result.interface.js';
import { type HealthIndicatorResult } from '../health-indicator/index.js';
import type {} from '@nestjs/swagger';

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

const healthIndicatorSchema = (example: HealthIndicatorResult) => ({
  type: 'object',
  example,
  additionalProperties: {
    type: 'object',
    required: ['status'],
    properties: {
      status: {
        type: 'string',
        enum: ['up', 'degraded', 'down'],
      },
      responseTime: {
        type: 'number',
        description: 'Time the health indicator took to respond, in ms',
      },
    },
    additionalProperties: true,
  },
});

export function getHealthCheckSchema(status: HealthCheckStatus) {
  return {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum:
          status === 'error' ? ['error', 'shutting_down'] : ['ok', 'degraded'],
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

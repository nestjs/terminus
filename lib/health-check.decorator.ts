import { ApiResponse } from '@nestjs/swagger/dist/decorators';
import { HttpStatus } from '@nestjs/common';

// TODO: Do actual implementation
export const HealthCheck = () =>
  ApiResponse({
    ...{ description: 'Forbidden' },
    status: HttpStatus.CONFLICT,
  });

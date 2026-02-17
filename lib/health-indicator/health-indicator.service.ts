import { Injectable } from '@nestjs/common';
import { type HealthIndicatorResult } from './health-indicator-result.interface';

/**
 * Helper service which can be used to create health indicator results
 * @publicApi
 */
@Injectable()
export class HealthIndicatorService {
  check<const Key extends string>(key: Key) {
    return new HealthIndicatorSession(key);
  }
}

/**
 * Show a compilation error if `status` is used in the additional data.
 */
type WithoutStatus<T> = {
  [K in keyof T]: K extends 'status' ? never : T[K];
};

type AdditionalData = Record<string, unknown>;

/**
 * Indicate the health of a health indicator with the given key
 *
 * @publicApi
 */
export class HealthIndicatorSession<Key extends Readonly<string> = string> {
  constructor(private readonly key: Key) {}

  /**
   * Mark the health indicator as `down`
   * @param data additional data which will get appended to the result object
   * @remarks The `status` key is reserved and cannot be used in additional data.
   */
  down<T extends AdditionalData>(
    data?: T & WithoutStatus<T>,
  ): HealthIndicatorResult<Key, 'down', T>;
  down<T extends string>(
    data?: T,
  ): HealthIndicatorResult<Key, 'down', { message: T }>;
  down<T extends AdditionalData | string>(
    data?: T,
  ): HealthIndicatorResult<Key, 'down'> {
    let additionalData: AdditionalData = {};

    if (typeof data === 'string') {
      additionalData = { message: data };
    } else if (typeof data === 'object') {
      additionalData = data;
    }

    if ('status' in additionalData) {
      throw new Error(
        '"status" is a reserved key and cannot be used in additional data',
      );
    }

    const detail = {
      ...additionalData,
      status: 'down' as const,
    };

    return {
      [this.key]: detail,
      // TypeScript does not infer this.key as Key correctly.
    } as Record<Key, typeof detail>;
  }

  /**
   * Mark the health indicator as `up`
   * @param data additional data which will get appended to the result object
   * @remarks The `status` key is reserved and cannot be used in additional data.
   */
  up<T extends AdditionalData>(
    data?: T & WithoutStatus<T>,
  ): HealthIndicatorResult<Key, 'up', T>;
  up<T extends string>(
    data?: T,
  ): HealthIndicatorResult<Key, 'up', { message: T }>;
  up<T extends AdditionalData | string>(
    data?: T,
  ): HealthIndicatorResult<Key, 'up'> {
    let additionalData: AdditionalData = {};

    if (typeof data === 'string') {
      additionalData = { message: data };
    } else if (typeof data === 'object') {
      additionalData = data;
    }

    if ('status' in additionalData) {
      throw new Error(
        '"status" is a reserved key and cannot be used in additional data',
      );
    }

    const detail = {
      ...additionalData,
      status: 'up' as const,
    };

    return {
      [this.key]: detail,
      // TypeScript does not infer this.key as Key correctly.
    } as Record<Key, typeof detail>;
  }
}

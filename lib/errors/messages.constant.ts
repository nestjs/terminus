/**
 * @internal
 */
export const CONNECTION_NOT_FOUND =
  'Connection provider not found in application context';

/**
 * @internal
 */
export const TIMEOUT_EXCEEDED = (timeout: number) =>
  `Timeout of ${timeout.toString()}ms exceeded`;

/**
 * @internal
 */
export const STORAGE_EXCEEDED = (keyword: string) =>
  `Used ${keyword} exceeded the set threshold`;

/**
 * @internal
 */
export const UNHEALTHY_RESPONSE_CODE = (responseCode: string | number) =>
  `The service returned an unhealthy response code: ${responseCode}`;

/**
 * @internal
 */
export const DATABASE_NOT_CONNECTED = `Not connected to database`;

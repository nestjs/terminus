/**
 * Thrown when the gRPC health service answers, but not with `SERVING`.
 * Keeps the answer for the failure data.
 * @internal
 */
export class NotServingError extends Error {
  constructor(
    readonly statusCode: number,
    readonly servingStatus: string | number,
  ) {
    super(`serving status: ${servingStatus}`);
  }
}

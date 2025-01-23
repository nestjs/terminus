/**
 * @deprecated
 * This class has been deprecated and will be removed in the next major release.
 * Instead utilise the `HealthIndicatorService` to indicate the health of your health indicator.
 */
export class HealthCheckError extends Error {
  causes: any;
  isHealthCheckError = true;
  constructor(message: string, causes: any) {
    super(message);

    this.causes = causes;

    Error.captureStackTrace(this, this.constructor);
  }
}

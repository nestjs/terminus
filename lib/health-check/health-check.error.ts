export class HealthCheckError extends Error {
  causes: any;
  constructor(message: string, causes: any) {
    super(message);

    this.causes = causes;

    Error.captureStackTrace(this, this.constructor);
  }
}

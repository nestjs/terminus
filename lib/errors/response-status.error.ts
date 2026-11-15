/**
 * Thrown when an HTTP check gets a response it does not accept.
 * Keeps the status of the response for the failure data.
 * @internal
 */
export class ResponseStatusError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly statusText?: string,
  ) {
    super(message);
  }
}

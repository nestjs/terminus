import { isError } from './is-error.js';

export function errorMessage(err: unknown): string {
  if (isError(err)) {
    return err.message;
  }
  return String(err);
}

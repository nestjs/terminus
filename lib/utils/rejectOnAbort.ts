/**
 * Rejects the promise if the signal is aborted.
 * @param promise The promise to execute
 * @param signal The abort signal to listen to
 * @returns A promise that resolves to the result of the input promise or rejects if the signal is aborted
 */
export function rejectOnAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(signal.reason);
  }
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      signal.addEventListener('abort', () => reject(signal.reason)),
    ),
  ]);
}

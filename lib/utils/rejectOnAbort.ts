/**
 * Rejects the promise if the signal is aborted.
 * @param promise The promise (or plain value) to execute
 * @param signal The abort signal to listen to
 * @returns A promise that resolves to the result of the input promise or rejects if the signal is aborted
 */
export function rejectOnAbort<T>(
  promise: T | PromiseLike<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(signal.reason);
  }
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      signal.addEventListener('abort', () => reject(signal.reason)),
    ),
  ]);
}

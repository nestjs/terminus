/**
 * Rejects the promise if the signal is aborted.
 * @param promise The promise (or plain value) to execute
 * @param signal The abort signal to listen to
 * @returns A promise that resolves to the result of the input promise or rejects if the signal is aborted
 */
export function rejectOnAbort<TValue>(
  promise: TValue | PromiseLike<TValue>,
  signal: AbortSignal,
): Promise<TValue> {
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

import { anySignal } from './anySignal.js';
import { rejectOnAbort } from './rejectOnAbort.js';

/**
 * Runs `fn` with an `AbortSignal` and rejects if it takes longer than `timeoutMs`.
 * The signal is always aborted once `fn` has settled, so `fn` can clean up.
 *
 * @param timeoutMs The timeout in milliseconds, or `undefined` for no timeout
 * @param fn The function to run
 */
export async function runWithTimeout<TResult>(
  timeoutMs: number | undefined,
  fn: (signal: AbortSignal) => TResult | PromiseLike<TResult>,
): Promise<TResult> {
  const controller = new AbortController();
  const signals = [controller.signal];
  let timeout: AbortSignal | undefined;

  if (timeoutMs !== undefined) {
    timeout = AbortSignal.timeout(timeoutMs);
    signals.push(timeout);
  }
  const signal = anySignal(signals);

  try {
    return await rejectOnAbort(fn(signal), signal);
  } catch (err) {
    if (timeout?.aborted) {
      throw new Error(`timeout of ${timeoutMs}ms exceeded`, { cause: err });
    }
    throw err;
  } finally {
    controller.abort();
  }
}

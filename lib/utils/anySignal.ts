/**
 * AbortSignal.any() causes memory leaks in Node.js versions prior to 26.
 * This utility function provides a safe alternative to `AbortSignal.any()` that avoids memory leaks in older Node.js versions.
 *
 * @see https://github.com/nodejs/node/issues/54614
 * @see https://github.com/nestjs/terminus/issues/2767
 *
 * FIXME: Remove this utility once Node.js 26 is the minimum supported version.
 */
export function anySignal(signals: readonly AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  const alreadyAborted = signals.find((signal) => signal.aborted);

  if (alreadyAborted) {
    controller.abort(alreadyAborted.reason);
    return controller.signal;
  }

  const onAbort = (event: Event) => {
    signals.forEach((signal) => signal.removeEventListener('abort', onAbort));
    controller.abort((event.target as AbortSignal).reason);
  };
  signals.forEach((signal) => signal.addEventListener('abort', onAbort));

  return controller.signal;
}

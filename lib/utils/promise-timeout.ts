/**
 * An errors which gets raised when the timeout
 * exceeded
 *
 * @internal
 */
export class TimeoutError extends Error {}

/**
 * Executes a promise in the given timeout. If the promise
 * does not finish in the given timeout, it will
 * raise a TimeoutError
 *
 * @param {number} ms The timeout in milliseconds
 * @param {Promise<any>} promise The promise which should get executed
 *
 * @internal
 */
export const promiseTimeout = <T>(
  ms: number,
  promise: Promise<T>,
): Promise<T> => {
  let timer: NodeJS.Timeout;
  return Promise.race<T>([
    promise,
    new Promise(
      (_, reject) =>
        (timer = setTimeout(
          () => reject(new TimeoutError(`Timed out in ${ms}ms.`)),
          ms,
        )),
    ),
  ]).finally(() => clearTimeout(timer));
};

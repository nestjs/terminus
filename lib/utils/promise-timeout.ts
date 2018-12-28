/**
 * An errors which gets raised when the timeout
 * exceeded
 */
export class TimeoutError extends Error {}

/**
 * Executes a promise in the given timeout. If the promise
 * does not finish in the given timeout, it will
 * raise a TimeoutError
 *
 * @param {number} ms The timeout in milliseconds
 * @param {Promise<unknown>} promise The promise which should get executed
 */
export const promiseTimeout = function(
  ms: number,
  promise: Promise<unknown>,
): Promise<unknown> {
  // Create a promise that rejects in <ms> milliseconds
  let timeout = new Promise((_, reject) => {
    let id = setTimeout(() => {
      clearTimeout(id);
      reject(new TimeoutError('Timed out in ' + ms + 'ms.'));
    }, ms);
  });

  // Returns a race between our timeout and the passed in promise
  return Promise.race([promise, timeout]);
};

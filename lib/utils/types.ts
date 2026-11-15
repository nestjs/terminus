/**
 * @internal
 */
export type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
/**
 * @internal
 */
export type XOR<T, U> = T | U extends object
  ? (Without<T, U> & U) | (Without<U, T> & T)
  : T | U;

/**
 * @internal
 */
export type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];

/**
 * `true` only for `any`: `1 & any` is `any`, every other `1 & T` is `1` or `never`.
 * @internal
 */
export type IsAny<T> = 0 extends 1 & T ? true : false;

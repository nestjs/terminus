/**
 * @internal
 */
export type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
/**
 * @internal
 */
export type XOR<T, U> = (T | U) extends object
  ? (Without<T, U> & U) | (Without<U, T> & T)
  : T | U;

/**
 * @internal
 */
export type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];

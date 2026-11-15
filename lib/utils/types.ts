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

/**
 * `TBase` and `TOver`, where `TOver` wins on shared keys. A plain
 * intersection when no key is shared, which reads better on hover.
 * `TBase` may be `undefined` (nothing set yet), then it is just `TOver`.
 * @internal
 */
export type Merge<TBase, TOver> = [TBase] extends [object]
  ? Extract<keyof TBase, keyof TOver> extends never
    ? TBase & TOver
    : {
        [K in keyof TBase as K extends keyof TOver ? never : K]: TBase[K];
      } & TOver
  : TOver;

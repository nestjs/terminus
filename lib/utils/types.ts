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
 * `TBase` and `TOver`, where `TOver` wins on shared keys. A plain
 * intersection when no key is shared, which reads better on hover.
 * `TBase` may be `undefined` (nothing set yet), then it is just `TOver`.
 * @internal
 */
export type Merge<TBase, TOver> = [TBase] extends [object]
  ? Extract<keyof TBase, keyof TOver> extends never
    ? TBase & TOver
    : {
        [
          TKey in keyof TBase as TKey extends keyof TOver ? never : TKey
        ]: TBase[TKey];
      } & TOver
  : TOver;

// The same format as `@nestjs/resilience`, so `'2s'` means the same in both packages
const DurationUnit = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
} as const;

const SizeUnit = {
  kb: 1024,
  mb: 1024 ** 2,
  gb: 1024 ** 3,
  tb: 1024 ** 4,
} as const;

/**
 * Milliseconds, or a string such as `'300ms'`, `'2s'` or `'15m'`
 * (units: `ms`, `s`, `m`, `h`, `d`, `w`).
 * @publicApi
 */
export type Duration = number | `${number}${keyof typeof DurationUnit}`;

/**
 * Bytes, or a string such as `'512kb'`, `'150mb'` or `'2gb'`
 * (units: `kb`, `mb`, `gb`, `tb`; 1 mb is 1024 × 1024 bytes).
 * @publicApi
 */
export type ByteSize = number | `${number}${keyof typeof SizeUnit}`;

const UNIT_STRING = /^(\d+(?:\.\d+)?)([a-z]+)$/;

/**
 * A `Duration` in milliseconds. Numbers are returned as they are.
 * @internal
 */
export function toMs(duration: Duration, name: string): number {
  if (typeof duration === 'number') {
    return duration;
  }
  const [, amount, unit] = UNIT_STRING.exec(duration) ?? [];
  if (!unit || !Object.hasOwn(DurationUnit, unit)) {
    throw new Error(
      `${name}: Invalid duration "${duration}". Use milliseconds or a string such as "300ms", "2s" or "15m".`,
    );
  }
  return Math.round(
    Number(amount) * DurationUnit[unit as keyof typeof DurationUnit],
  );
}

/**
 * A `ByteSize` in bytes. Numbers are returned as they are.
 * @internal
 */
export function toBytes(size: ByteSize, name: string): number {
  if (typeof size === 'number') {
    return size;
  }
  const [, amount, unit] = UNIT_STRING.exec(size) ?? [];
  if (!unit || !Object.hasOwn(SizeUnit, unit)) {
    throw new Error(
      `${name}: Invalid size "${size}". Use bytes or a string such as "512kb", "150mb" or "2gb".`,
    );
  }
  return Math.floor(Number(amount) * SizeUnit[unit as keyof typeof SizeUnit]);
}

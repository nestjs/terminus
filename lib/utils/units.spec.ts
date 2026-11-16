import { type ByteSize, type Duration, toBytes, toMs } from './units.js';

describe('toMs', () => {
  it.each([
    ['250ms', 250],
    ['2s', 2_000],
    ['15m', 900_000],
    ['6h', 21_600_000],
    ['3d', 259_200_000],
    ['1w', 604_800_000],
    ['1.5s', 1_500],
    ['1.0005s', 1_001],
    ['0s', 0],
  ] as const)('parses %s', (value, ms) => {
    expect(toMs(value, 'Timeout')).toBe(ms);
  });

  it('returns a number as it is', () => {
    expect(toMs(1.5, 'Timeout')).toBe(1.5);
  });

  it.each([
    '',
    '2',
    '2S',
    '2 s',
    ' 2s',
    '-1s',
    '.5s',
    '1e3ms',
    '2x',
    '2 seconds',
  ])('rejects %j', (value) => {
    expect(() => toMs(value as Duration, 'Timeout')).toThrow(
      `Timeout: Invalid duration "${value}". Use milliseconds or a string such as "300ms", "2s" or "15m".`,
    );
  });

  it('rejects a unit from the object prototype', () => {
    expect(() => toMs('1constructor' as Duration, 'Timeout')).toThrow(
      'Invalid duration',
    );
  });
});

describe('toBytes', () => {
  it.each([
    ['512kb', 512 * 1024],
    ['150mb', 150 * 1024 ** 2],
    ['2gb', 2 * 1024 ** 3],
    ['1tb', 1024 ** 4],
    ['1.5kb', 1_536],
    ['0.001kb', 1],
    ['0mb', 0],
  ] as const)('parses %s', (value, bytes) => {
    expect(toBytes(value, 'Heap threshold')).toBe(bytes);
  });

  it('returns a number as it is', () => {
    expect(toBytes(NaN, 'Heap threshold')).toBeNaN();
  });

  it.each(['', '150', '150MB', '150Mb', '150 mb', '-1mb', '1b', '1pb', '1mib'])(
    'rejects %j',
    (value) => {
      expect(() => toBytes(value as ByteSize, 'Heap threshold')).toThrow(
        `Heap threshold: Invalid size "${value}". Use bytes or a string such as "512kb", "150mb" or "2gb".`,
      );
    },
  );
});

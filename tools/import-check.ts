/**
 * This file exists because no dynamically loaded dependencies's type definitons
 * are allowed in the NestJS Terminus type definitions.
 *
 */

const allowList = [
  // Dependencies which are directly required by Terminus or NestJS itself
  '@nestjs/core',
  '@nestjs/common',
  'rxjs',
  'check-disk-space',

  // NodeJS std
  'assert',
  'buffer',
  'child_process',
  'console',
  'cluster',
  'crypto',
  'dgram',
  'dns',
  'events',
  'fs',
  'http',
  'http2',
  'https',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'timers',
  'tls',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'wasi',
  'worker',
  'zlib',
];

import { rollup } from 'rollup';
import dts from 'rollup-plugin-dts';

rollup({
  input: './dist/index.d.ts',
  output: [{ file: 'index.d.ts', format: 'es' }],
  plugins: [dts()],
})
  .then((bundle) => bundle.generate({ format: 'es' }))
  .then((a) => a.output[0].imports)
  .then((imports) => {
    for (const i of imports) {
      if (!allowList.includes(i)) {
        throw new Error(
          `Import "${i}" is not allowed in type definition files. If this is a mistake, update tools/import-check.ts`,
        );
      }
    }
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });

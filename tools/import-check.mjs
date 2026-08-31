/**
 * No dynamically loaded dependency's type definitions are allowed in the
 * NestJS Terminus type definitions
 *
 * Scans the emitted `.d.ts` files for bare import specifiers and checks them
 * against the allow list below.
 */
import { readdir, readFile } from 'node:fs/promises';
import { builtinModules } from 'node:module';
import { join } from 'node:path';

const allowList = [
  // Dependencies which are directly required by Terminus or NestJS itself
  '@nestjs/core',
  '@nestjs/common',
  'rxjs',

  // NodeJS std
  ...builtinModules,
];

const DIST = './dist';

/** Matches `from '…'`, `import '…'` and `import('…')`. */
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g;

async function* declarationFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* declarationFiles(path);
    } else if (entry.name.endsWith('.d.ts')) {
      yield path;
    }
  }
}

/** `@nestjs/common/services/logger.service` -> `@nestjs/common` */
function packageOf(specifier) {
  const segments = specifier.split('/');
  return specifier.startsWith('@')
    ? segments.slice(0, 2).join('/')
    : segments[0];
}

const violations = [];

for await (const file of declarationFiles(DIST)) {
  const source = await readFile(file, 'utf8');
  for (const [, specifier] of source.matchAll(SPECIFIER)) {
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      continue;
    }
    const pkg = packageOf(specifier);
    if (pkg.startsWith('node:') || allowList.includes(pkg)) {
      continue;
    }
    violations.push(`${file}: "${specifier}"`);
  }
}

if (violations.length) {
  console.error(
    `Imports which are not allowed in type definition files. If this is a mistake, update tools/import-check.mjs:\n${violations.join(
      '\n',
    )}`,
  );
  process.exit(1);
}
